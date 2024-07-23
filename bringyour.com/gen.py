import os

# webgen adds the following fields:
#   page_path
#   page_path
#   file_name
#   build_phase
#   build_dirpath


def css(path, inline):
    if inline:
        with open(os.path.join(build_dirpath, path), 'r') as f:
            content = f.read()
        return f"""<style>{content}</style>"""
    else:
        return f"""<link rel="stylesheet" href="/{path}">"""


def js(path, inline, defer=False):
    if inline:
        with open(os.path.join(build_dirpath, path), 'r') as f:
            content = f.read()
        return f"""<script>{content}</script>"""
    elif defer:
        return f"""<script src="/{path}" defer></script>"""
    else:
        return f"""<script src="/{path}"></script>"""


def html_header():
    return """
    <!DOCTYPE html>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <html lang="en">
    """


def html_footer():
    return """
    </html>
    """


def title_icons_meta():
    return """
    <meta charset="UTF-8">
    <title>BringYour VPN Everywhere</title>
    <link rel="icon" type="image/svg+xml" sizes="any" href="/favicon.svg">
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
    <link rel="icon" type="image/png" sizes="128x128" href="/favicon-128.png">
    <link rel="icon" type="image/png" sizes="180x180" href="/favicon-180.png">
    <link rel="icon" type="image/png" sizes="192x192" href="/favicon.png">
    <link rel="apple-touch-icon" type="image/png" sizes="192x192" href="/apple-touch-icon.png">

    <meta name="viewport" content="width=device-width, initial-scale=0.4">
    <meta name="description" content="Instant worldwide VPN everywhere. Let's build the best privacy, security, and personal data control network with just our phones and tablets.">
    """


def fonts():
    if build_phase == 'final':
        # inline resources for the index
        inline = (page_path == 'index')
    else:
        inline = False

    return """
    {css_barlow}
    {css_material_symbols_outlined}
    {css_noto_sans}
    {css_pacifico}
    """.format(
        css_barlow=css('res/fonts/barlow.css', inline),
        css_material_symbols_outlined=css('res/fonts/material-symbols-outlined.css', inline),
        css_noto_sans=css('res/fonts/noto-sans.css', inline),
        css_pacifico=css('res/fonts/pacifico.css', inline),
    )


def app_js_css():
    if build_phase == 'final':
        # inline resources for the index
        inline = (page_path == 'index')
    else:
        inline = False

    if build_phase == 'final' and page_path == 'index':
        # to improve page load time,
        # the script elements are manually inserted after a delay
        stats_bundle = ''
        logo_bundle = ''
    else:
        stats_bundle = """
        <script src="/lib/d3.min.js" defer></script>
        <script src="/stats.js" defer></script>
        """
        logo_bundle = """
        <script src="/lib/p5.min.js" defer></script>
        <script src="/logo.js" defer></script>
        <script src="/sketch_220824a.js" defer></script>
        """

    return """
    {css_bootstrap}
    {css_main}
    {css_stats}
    {css_connect}

    {js_client}
    {js_window}
    {js_flag}

    <script src="/lib/jquery.min.js" defer></script>
    <script src="/lib/bootstrap.bundle.min.js" defer></script>

    <script src="/connect.js" defer></script>

    {stats_bundle}
    {logo_bundle}
    
    <script src="https://accounts.google.com/gsi/client" defer></script>
    <script src="https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js" defer></script>
    """.format(
        css_bootstrap=css('res/css/bootstrap.min.css', inline),
        css_main=css('res/css/main.css', inline),
        css_stats=css('res/css/stats.css', inline),
        css_connect=css('res/css/connect.css', inline),
        js_client=js('client.js', inline),
        js_window=js('window.js', inline),
        js_flag=js('flag.js', inline),
        stats_bundle=stats_bundle,
        logo_bundle=logo_bundle,
    )


def dialog_connect():
    if page_path in ['index']:
        auth_auto_prompt = 'true'
    else:
        auth_auto_prompt = 'false'

    return """
    <div class="modal fade" id="dialog-connect" tabindex="-1" aria-labelledby="dialog-connect" aria-hidden="true">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <div class="dialog" id="dialog-mount">
                        <script>
                             windowLoadCallbacks.push(() => {
                                let mount = createConnectMount('dialog-mount')
                                // exported for connect
                                window.connectMount = mount
                                // exported for connect
                                window.showConnectDialog = () => {
                                    $('#dialog-connect').modal('show')
                                }
                                mount.router()

                                let byJwtData = parseByJwt()
                                let resetCode = new URLSearchParams(window.location.search).get('resetCode')
                                if (resetCode) {
                                    mount.render(new DialogPasswordResetComplete(resetCode))
                                } else if (byJwtData) {
                                    let networkName = byJwtData['networkName']
                                    mount.render(new DialogComplete(networkName))
                                } else {
                                    mount.render(new DialogInitial(""" + auth_auto_prompt + """))
                                }
                            })
                        </script>
                    </div>
                </div>
            </div>
        </div>
    </div>
    """


def tab_header():
    if page_path == 'index':
        canonical_page_path = ''
    else:
        canonical_page_path = page_path

    tabs = [
        ('', 'Network'),
        ('pricing', 'Pricing'),
        ('faq', 'FAQ'),
        ('participate', 'Participate'),
        ('about', 'About')
    ]

    tab_html_parts = []
    for tab_page_path, tab_title in tabs:
        if tab_page_path == canonical_page_path:
            tab_html_part = f"""<div class="tab tab-selected">{tab_title}</div>"""
        else:
            tab_html_part = f"""<a href="/{tab_page_path}"><div class="tab">{tab_title}</div></a>"""
        tab_html_parts.append(tab_html_part)

    return """
    <div id="header">
        <table>
            <tbody>
                <tr>
                    <td id="logo"><img id="logo-placeholder" src="/res/images/logo-placeholder.png" alt="BringYour"></td>
                    <td class="expand"><div class="tab-container">{tab_html}</div></td>
                    <td class="start"><button type="button" id="start" class="btn btn-primary d-none" data-bs-toggle="modal" data-bs-target="#dialog-connect">Get Connected</button></td>
                </tr>
            </tbody>
        </table>
    </div>
    <div id="header-place"></div>
    """.format(
        tab_html=''.join(tab_html_parts)
    )


def footer():
    from datetime import datetime

    return """
    <div id="footer">
        <div class="link-container">
            <table>
                <tbody>
                    <tr>
                        <td>
                            <div class="link"><a href="/whitepaper" target="_blank">Whitepaper</a></div>
                            <div class="link"><a href="https://status.bringyour.com" target="_blank">Status</a></div>
                            <div class="link"><a href="https://github.com/bringyour" target="_blank"><img src="/res/images/s2-github.svg" class="social" alt="github"> GitHub</a></div>
                            <div class="link"><a href="/discord" target="_blank"><img src="/res/images/s2-discord.svg" class="social" alt="discord"> Discord Community</a></div>
                            <div class="social-container"><div><a href="https://www.reddit.com/r/bringyour" target="_blank"><img src="/res/images/s2-reddit.svg" class="social" alt="reddit"></a></div><div><a href="https://www.youtube.com/@bringyour" target="_blank"><img src="/res/images/s2-youtube.svg" class="social" alt="youtube"></a></div><div><a href="https://www.linkedin.com/company/bringyour" target="_blank"><img src="/res/images/s2-linkedin.svg" class="social" alt="linkedin"></a></div></div>
                        </td>
                        <td>
                            <div class="link"><a href="/buy-data">Buy Data</a></div>
                            <div class="store"><a href="https://play.google.com/store/apps/details?id=com.bringyour.network" target="_blank"><img src="/res/images/store-play.png" alt="get the app on the Google Play store"></a></div>
                            <div class="link"><a href="/api">API</a></div>
                            <div class="link"><a href="/roadmap" target="_blank">Platform Roadmap</a></div>
                            <div class="link"><a href="https://github.com/bringyour/product/discussions" target="_blank">Product Feedback</a></div>
                        </td>
                        <td>
                            <div class="link"><a href="/terms">Terms of Service</a></div>
                            <div class="link"><a href="/privacy">Privacy Policy</a></div>
                            <div class="link"><a href="/vdp">Vulnerability Disclosure Policy</a></div>
                            <div class="link"><a href="/trust-and-safety">Trust and Safety</a></div>
                            <div class="link"><a href="/transparency-report">Transparency Report</a></div>
                            <div class="link"><a href="/warrant-canary">Warrant Canary</a></div>
                        </td>
                    </tr>
                </tbody>
            </table>
            <div class="copyline">Copyright {year} BringYour, Inc.</div>
        </div>
    </div>
    <script src="/footer.js"></script>
    """.format(
        year=datetime.now().year
    )

