"""Naval Fate.

Usage:
  webgen.py clean <gen.py>
  webgen.py build <gen.py>
  webgen.py (-h | --help)
  webgen.py --version

Options:
  -h --help     Show this screen.
  --version     Show version.

"""
import sys
import os

from docopt import docopt


def clean(dirpath):
    import shutil

    build_dirnames = [
        filename
        for filename in os.listdir(dirpath)
        if filename in ['build'] or filename.startswith('build.')
    ]

    for build_dirname in build_dirnames:
        build_dirpath = os.path.join(dirpath, build_dirname)
        sys.stdout.write(f'rm {build_dirpath}\n')

        if os.path.islink(build_dirpath):
            os.remove(build_dirpath)
        elif os.path.isdir(build_dirpath):
            shutil.rmtree(build_dirpath)


def build(dirpath, minify=True, validate=True):
    import subprocess
    import time
    from jinja2 import Environment, FileSystemLoader, select_autoescape
    import shutil

    timestamp = int(time.time())
    build_root_dirname = f'build.{timestamp}'
    build_root_dirpath = os.path.join(dirpath, build_root_dirname)
    build_dirname = os.path.join(build_root_dirname, "build")
    build_dirpath = os.path.join(build_root_dirpath, 'build')

    jinja_env = Environment(
        loader=FileSystemLoader(dirpath),
        autoescape=select_autoescape()
    )

    sys.path.append(dirpath)
    import gen
    exported_symbols = {
        name: gen.__dict__[name]
        for name in dir(gen)
        if not name.startswith('_')
    }
    jinja_env.globals.update(exported_symbols)
    # export variables into the gen module
    gen.build_dirpath = build_dirpath

    def process_j2(parent_dirpath, process_filename):
        file_name = process_filename[:-len(j2_suffix)]
        out_path = os.path.join(build_dirpath, parent_dirpath, f'{file_name}')

        sys.stdout.write(f'[{gen.build_phase}] Processing {out_path} ...')
        sys.stdout.flush()
        
        gen.file_name = file_name
        template = jinja_env.get_template(os.path.join(parent_dirpath, process_filename))
        file_content = template.render(
            file_name=file_name
        )

        with open(out_path, 'w') as f:
            f.write(file_content)
        
        sys.stdout.write(' done.\n')

    def process_page(parent_dirpath, process_filename):
        page_name = process_filename[:-len(page_suffix)]
        page_path = os.path.join(parent_dirpath, page_name)
        out_path = os.path.join(build_dirpath, parent_dirpath, f'{page_name}.html')

        sys.stdout.write(f'[{gen.build_phase}] Processing {out_path} ...')
        sys.stdout.flush()
        
        gen.page_name = page_name
        gen.page_path = page_path
        template = jinja_env.get_template(os.path.join(parent_dirpath, process_filename))
        page_html = template.render(
            page_name=page_name,
            page_path=page_path
        )
        
        if minify:
            with open(os.path.join(build_dirpath, parent_dirpath, f'{page_name}.html.tmp'), 'w') as f:
                f.write(page_html)
            
            sys.stdout.write(f'...')
            sys.stdout.flush()
            p = subprocess.run([
                'html-minifier',
                '--minify-css', 'true',
                '--minify-js', 'true',
                '--minify-urls', 'true',
                '--collapse-whitespace',
                '--conservative-collapse',
                '--remove-comments',
                # '--decode-entities',
                '--case-sensitive',
                # '--remove-optional-tags',
                '--sort-attributes',
                '--sort-class-name',
                '--trim-custom-fragments',
                '--use-short-doctype',
                # '--remove-empty-attributes',
                # '--remove-attribute-quotes',
                '-o', out_path,
                os.path.join(build_dirpath, parent_dirpath, f'{page_name}.html.tmp')
            ])
            os.remove(os.path.join(build_dirpath, parent_dirpath, f'{page_name}.html.tmp'))
        else:
            with open(out_path, 'w') as f:
                f.write(page_html)

        if validate:
            sys.stdout.write(f'...')
            sys.stdout.flush()
            p = subprocess.run([
                'html-validate',
                '--rule=doctype-style:off',
                out_path
            ])
            if p.returncode == 0:
                sys.stdout.write(' valid')
                sys.stdout.flush()
            else:
                print(f'Error: "{out_path}" is not valid\n', file=sys.stderr)
                sys.exit(1)

        sys.stdout.write(' done.\n')

    def process_css(parent_dirpath, process_filename):
        if not minify or process_filename.endswith('.min.css'):
            process_file(parent_dirpath, process_filename)
            return

        out_path = os.path.join(build_dirpath, parent_dirpath, process_filename)

        sys.stdout.write(f'[{gen.build_phase}] Processing {os.path.join(build_dirpath, parent_dirpath, process_filename)} ...')
        sys.stdout.flush()
        shutil.copyfile(
            os.path.join(dirpath, parent_dirpath, process_filename),
            os.path.join(build_dirpath, parent_dirpath, f'{process_filename}.tmp')
        )
        p = subprocess.run([
            'cleancss',
            '-o', out_path,
            os.path.join(build_dirpath, parent_dirpath, f'{process_filename}.tmp')
        ])
        if p.returncode != 0:
            print(f'Error: "{out_path}" is not valid\n', file=sys.stderr)
            sys.exit(1)
        os.remove(os.path.join(build_dirpath, parent_dirpath, f'{process_filename}.tmp'))
        sys.stdout.write(' done.\n')

    def process_js(parent_dirpath, process_filename):
        if not minify or process_filename.endswith('.min.js'):
            process_file(parent_dirpath, process_filename)
            return

        out_path = os.path.join(build_dirpath, parent_dirpath, process_filename)

        sys.stdout.write(f'[{gen.build_phase}] Processing {os.path.join(build_dirpath, parent_dirpath, process_filename)} ...')
        sys.stdout.flush()
        shutil.copyfile(
            os.path.join(dirpath, parent_dirpath, process_filename),
            os.path.join(build_dirpath, parent_dirpath, f'{process_filename}.tmp')
        )
        p = subprocess.run([
            'uglifyjs',
            '--validate',
            '-o', out_path,
            os.path.join(build_dirpath, parent_dirpath, f'{process_filename}.tmp')
        ])
        if p.returncode != 0:
            print(f'Error: "{out_path}" is not valid\n', file=sys.stderr)
            sys.exit(1)
        os.remove(os.path.join(build_dirpath, parent_dirpath, f'{process_filename}.tmp'))
        sys.stdout.write(' done.\n')

    def process_file(parent_dirpath, process_filename):
        sys.stdout.write(f'[{gen.build_phase}] Copy {os.path.join(build_dirpath, parent_dirpath, process_filename)}\n')
        shutil.copyfile(
            os.path.join(dirpath, parent_dirpath, process_filename),
            os.path.join(build_dirpath, parent_dirpath, process_filename)
        )

    def purge_unused_css():
        css_paths = []
        content_paths = []
        for process_dirpath, process_dirnames, process_filenames in os.walk(build_dirpath, topdown=True, followlinks=True):
            for process_filename in process_filenames:
                if process_filename.endswith('.css'):
                    css_paths.append(os.path.join(process_dirpath, process_filename))
                elif process_filename.endswith('.html') or process_filename.endswith('.js'):
                    content_paths.append(os.path.join(process_dirpath, process_filename))

        if 0 < len(css_paths) and 0 < len(content_paths):
            purge_unused_css_path = os.path.join(build_root_dirpath, 'purgecss')
            os.makedirs(purge_unused_css_path)
            
            sys.stdout.write(f'[{gen.build_phase}] Purge {len(css_paths)} css files using {len(content_paths)} content files ...')
            sys.stdout.flush()
            p = subprocess.run([
                'purgecss',
                '--css'] + css_paths + [
                '--content'] + content_paths + [
                '--font-face',
                '--output', purge_unused_css_path
            ])
            sys.stdout.write(' done.\n')

            # copy into place
            for process_dirpath, process_dirnames, process_filenames in os.walk(build_dirpath, topdown=True, followlinks=True):
                for process_filename in process_filenames:
                    if process_filename.endswith('.css'):
                        purged_css_path = os.path.join(purge_unused_css_path, process_filename)
                        sys.stdout.write(f'[{gen.build_phase}] Copy {purged_css_path}\n')
                        shutil.copyfile(
                            purged_css_path,
                            os.path.join(process_dirpath, process_filename)
                        )


    # j2_files = [f for f in os.listdir(dirpath) if os.path.isfile(os.path.join(dirpath, f)) and f.endswith('.j2')]

    page_suffix = '.html.j2'
    j2_suffix = '.j2'

    page_targets = []
    j2_targets = []

    gen.build_phase = 'initial'
    for process_dirpath, process_dirnames, process_filenames in os.walk(dirpath, topdown=True, followlinks=True):
        if dirpath == process_dirpath:
            filtered_dirnames = [
                process_dirname
                for process_dirname in process_dirnames
                if not process_dirname.startswith('build') and process_dirname not in ['__pycache__']
            ]
            process_dirnames[:] = filtered_dirnames
            filtered_filenames = [
                process_filename
                for process_filename in process_filenames
                if process_filename not in ['build', 'gen.py', '.DS_Store']
            ]
            process_filenames[:] = filtered_filenames


        parent_dirpath = process_dirpath[len(os.path.commonpath([dirpath, process_dirpath]))+1:]
        # build_dirpath = os.path.join(build_path, parent_dirpath)
        os.makedirs(os.path.join(build_dirpath, parent_dirpath))
        
        for process_filename in process_filenames:
            target = (parent_dirpath, process_filename)

            if process_filename.endswith(page_suffix):
                page_targets.append(target)
                process_page(*target)
            elif process_filename.endswith(j2_suffix):
                j2_targets.append(target)
                process_j2(*target)
            elif process_filename.endswith('.css'):
                process_css(*target)
            elif process_filename.endswith('.js'):
                process_js(*target)
            else:
                process_file(*target)

    # FIXME we need to separate res into cdn res versus actually used on the site
    # purge_unused_css()

    gen.build_phase = 'final'
    for target in page_targets:
        process_page(*target)
    for target in j2_targets:
        process_j2(*target)

    sys.stdout.write(f'Done building "{build_dirpath}"\n')

    build_linkpath = os.path.join(dirpath, 'build')
    if os.path.islink(build_linkpath):
        os.remove(build_linkpath)
    os.symlink(build_dirname, build_linkpath, target_is_directory=True)

    sys.stdout.write(f'Linked to "{build_linkpath}"\n')


def webgen(args):
    gen_py_path = args['<gen.py>']

    if not os.path.isfile(gen_py_path):
        print(f'Error: "{gen_py_path}" does not exist\n', file=sys.stderr)
        sys.exit(1)

    dirpath, basename = os.path.split(gen_py_path)
    if basename != 'gen.py':
        print('Error: gen.py must point to file named "gen.py"\n', file=sys.stderr)
        sys.exit(1)

    if args['clean']:
        clean(dirpath)
        return

    if args['build']:
        build(dirpath)
        return


if __name__ == '__main__':
    args = docopt(__doc__, version='webgen 1.0.0')
    webgen(args)
