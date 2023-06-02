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


# webgen </path/to/gen.py>
# outputs to /path/to/build.<timestamp>

# eval gen.py
# scan for all j2 and convert to html with jinja template
# validate html
# recursively copy all other resources and apply minify rules as appropriate
# create robots.txt and sitemap.xml



# @page('index')
# def  index_html():
#   return ""


# sitemap('foobar')
# def foobar_sitemap():
#   return {
#       prop: True
#   }


# generates a sitemap
# https://www.sitemaps.org/protocol.html

# generates a robots.txt
# User-agent: *
# Allow: /

# Sitemap: https://bringyour.com/sitemap.xml

# GET https://www.google.com/ping?sitemap=https://bringyour.com/sitemap.txt

def clean(dirpath):
    pass


def build(dirpath, minify=True):
    # target = d/build.<timestamp>
    # rm d/build
    # ln -s d/build.<timestamp> d/build

    # eval d/gen.py
    # for each j2, eval template

    # (dirpath, dirnames, filenames)
    # for (process_dirpath, process_dirnames, process_filenames) in os.walk(dirpath):
    #     if dirpath == process_dirpath:
    #         for i, process_dirname in enumerate(process_dirnames):
    #             if process_dirname.startswith('build'):
    #                 del process_dirnames[i]
    #         for i, process_filename in enumerate(process_filenames):
    #             if process_filename == 'gen.py':
    #                 del process_filenames[i]

    #     p = os.path.commonpath(dirpath, process_dirpath)
    #     build_dirpath = os.path.join(build_path, process_dirpath[len(p):])
    #     os.makedirs(build_dirpath)




    import subprocess
    import time
    from jinja2 import Environment, FileSystemLoader, select_autoescape
    import shutil

    timestamp = int(time.time())
    build_dirpath = os.path.join(dirpath, f'build.{timestamp}')

    # os.makedirs(build_path)

    

    jinja_env = Environment(
        loader=FileSystemLoader(dirpath),
        autoescape=select_autoescape()
    )

    # gen_py_path = os.path.join(dirname, 'gen.py')
    sys.path.append(dirpath)
    import gen
    exported_symbols = {
        name: gen.__dict__[name]
        for name in dir(gen)
        if not name.startswith('_')
    }
    jinja_env.globals.update(exported_symbols)

    def process_page(parent_dirpath, process_filename):
        page_name = process_filename[:-len(page_suffix)]
        out_path = os.path.join(build_dirpath, parent_dirpath, f'{page_name}.html')

        sys.stdout.write(f'Processing {out_path} ...')
        sys.stdout.flush()
        

        template = jinja_env.get_template(os.path.join(parent_dirpath, process_filename))
        page_html = template.render(page_name=page_name)

        
        if minify:
            with open(os.path.join(build_dirpath, parent_dirpath, f'{page_name}.html.tmp'), 'w') as f:
                f.write(page_html)
            # FIXME html-validate the html before running the minifier

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

        sys.stdout.write(f'...')
        sys.stdout.flush()
        p = subprocess.run([
            'html-validate',
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

        sys.stdout.write(f'Processing {os.path.join(build_dirpath, parent_dirpath, process_filename)} ...')
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

        sys.stdout.write(f'Processing {os.path.join(build_dirpath, parent_dirpath, process_filename)} ...')
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
        sys.stdout.write(f'Copy {os.path.join(build_dirpath, parent_dirpath, process_filename)}\n')
        shutil.copyfile(
            os.path.join(dirpath, parent_dirpath, process_filename),
            os.path.join(build_dirpath, parent_dirpath, process_filename)
        )

    # j2_files = [f for f in os.listdir(dirpath) if os.path.isfile(os.path.join(dirpath, f)) and f.endswith('.j2')]

    page_suffix = '.html.j2'

    for process_dirpath, process_dirnames, process_filenames in os.walk(dirpath, topdown=True):
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
                if process_filename not in ['build', 'gen.py']
            ]
            process_filenames[:] = filtered_filenames


        parent_dirpath = process_dirpath[len(os.path.commonpath([dirpath, process_dirpath]))+1:]
        # build_dirpath = os.path.join(build_path, parent_dirpath)
        os.makedirs(os.path.join(build_dirpath, parent_dirpath))
        
        for process_filename in process_filenames:
            target = (parent_dirpath, process_filename)

            if process_filename.endswith(page_suffix):
                process_page(*target)
            elif process_filename.endswith('.css'):
                process_css(*target)
            elif process_filename.endswith('.js'):
                process_js(*target)
            else:
                process_file(*target)

    sys.stdout.write(f'Done building "{build_dirpath}"\n')

    """
    html-minifier --minify-css true --minify-js true --minify-urls true --collapse-whitespace --conservative-collapse --remove-comments --decode-entities --case-sensitive --remove-optional-tags --sort-attributes --sort-class-name --trim-custom-fragments --use-short-doctype --remove-empty-attributes --remove-attribute-quotes index.html
    """

    # with open(os.path.join(dirname, 'gen.py'), 'r') as f:
    #     gen_py = f.read()
    # eval(gen_py)

    build_linkpath = os.path.join(dirpath, 'build')
    if os.path.islink(build_linkpath):
        os.remove(build_linkpath)
    os.symlink(build_dirpath, build_linkpath, target_is_directory=True)

    sys.stdout.write(f'Linked to "{build_linkpath}"\n')



    pass



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
