
def title_icons_meta():
    return """
    <meta charset="UTF-8">
    <title>BringYour VPN Everywhere</title>
    <link rel="icon" type="image/svg+xml" href="favicon.svg">
    <link rel="icon" type="image/png" size="32x32" href="favicon-32.png">
    <link rel="icon" type="image/png" size="128x128" href="favicon-128.png">
    <link rel="icon" type="image/png" size="180x180" href="favicon-180.png">
    <link rel="icon" type="image/png" size="192x192" href="favicon.png">
    <link rel="apple-touch-icon" size="192x192" href="apple-touch-icon.png">

    <meta name="viewport" content="width=device-width, initial-scale=0.4">
    <meta name="description" content="Instant worldwide VPN everywhere. Let's build the best privacy, security, and personal data control network with just our phones and tablets.">
    """


def fonts():
    return """
    <link rel="stylesheet" href="/res/fonts/barlow.css">
    <link rel="stylesheet" href="/res/fonts/material-symbols-outlined.css">
    <link rel="stylesheet" href="/res/fonts/noto-sans.css">
    <link rel="stylesheet" href="/res/fonts/arkitech.css">
    <link rel="stylesheet" href="/res/fonts/pacifico.css">
    """


def app_js_css():
    return """
    <link rel="stylesheet" href="/res/css/bootstrap.min.css">
    <link rel="stylesheet" href="/res/css/main.css">
    <link rel="stylesheet" href="/res/css/stats.css">
    <link rel="stylesheet" href="/res/css/connect.css">

    <script src="/lib/d3.min.js"></script>
    <script src="/lib/p5.min.js"></script>
    <script src="/lib/jquery.min.js"></script>
    <script src="/lib/bootstrap.bundle.min.js"></script>

    <script src="/sketch_220824a.js"></script>
    <script src="/logo.js"></script>
    <script src="/client.js"></script>
    <script src="/stats.js"></script>
    <script src="/connect.js"></script>
    <script src="/window.js"></script>

    <script src="https://accounts.google.com/gsi/client"></script>
    <script src="https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js"></script>
    """


def dialog_connect(page_path):
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
                             (() => {
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
                            })()
                        </script>
                    </div>
                </div>
            </div>
        </div>
    </div>
    """


def tab_header(page_path):
    if page_path == 'index':
        canonical_page_path = '/'
    else:
        canonical_page_path = page_path

    tabs = [
        ('/', 'Network'),
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
            tab_html_part = f"""<a href="{tab_page_path}"><div class="tab">{tab_title}</div></a>"""
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
                            <div class="link"><a href="whitepaper" target="_blank">Whitepaper</a></div>
                            <div class="link"><a href="https://status.bringyour.com" target="_blank">Status</a></div>
                            <div class="link"><a href="https://github.com/bringyour" target="_blank"><img src="/res/images/s2-github.svg" class="social" alt="github"> GitHub</a></div>
                            <div class="link"><a href="discord" target="_blank"><img src="/res/images/s2-discord.svg" class="social" alt="discord"> Discord Community</a></div>
                            <div class="social-container"><div><a href="https://www.reddit.com/r/bringyour" target="_blank"><img src="/res/images/s2-reddit.svg" class="social" alt="reddit"></a></div><div><a href="https://www.youtube.com/@bringyour" target="_blank"><img src="/res/images/s2-youtube.svg" class="social" alt="youtube"></a></div><div><a href="https://www.linkedin.com/company/bringyour" target="_blank"><img src="/res/images/s2-linkedin.svg" class="social" alt="linkedin"></a></div></div>
                        </td>
                        <td>
                            <div class="store"><a href="https://play.google.com/store/apps/details?id=com.bringyour.network" target="_blank"><img src="/res/images/store-play.png" alt="get the app on the Google Play store"></a></div>
                            <div class="store"><a href="https://apps.apple.com/us/app/bringyour/id6446097114" target="_blank"><img src="/res/images/store-app.svg" alt="get the app on the Apple App Store"></a></div>
                            <div class="link"><a href="roadmap" target="_blank">Platform Roadmap</a></div>
                            <div class="link"><a href="https://github.com/bringyour/product/discussions" target="_blank">Product Feedback</a></div>
                        </td>
                        <td>
                            <div class="link"><a href="terms">Terms of Service</a></div>
                            <div class="link"><a href="privacy">Privacy Policy</a></div>
                            <div class="link"><a href="vdp">Vulnerability Disclosure Policy</a></div>
                        </td>
                    </tr>
                </tbody>
            </table>
            <div class="copyline">Copyright {year} BringYour, Inc.</div>
        </div>
    </div>
<<<<<<< HEAD
    <script src="footer.js"></script>
=======
    <script src="/footer.js"></script>
>>>>>>> main
    """.format(
        year=datetime.now().year
    )

