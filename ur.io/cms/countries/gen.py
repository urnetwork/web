import os
import hashlib
import re
import urllib.parse
import csv
import markdown
import anthropic
from google.cloud import translate


anthropic_client = anthropic.Anthropic(
    # defaults to os.environ.get("ANTHROPIC_API_KEY")
    api_key=os.environ.get("ANTHROPIC_API_KEY"),
)
google_project = 'projects/bringyour'


def claude(prompt, natural=True):
    # fixme add " In Spanish." to the prompt, and then translate from spanish to english
    # Replace placeholders like {{COUNTRY_NAME}} with real values,
    # because the SDK does not support variables.

    if natural:
        prompt = "{} In Spanish.".format(prompt)

    message = anthropic_client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=5000,
        temperature=0,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": prompt
                    }
                ]
            }
        ]
    )
    
    out = ""
    for b in message.content:
        for c in b.text.split('\n'):
            if c and natural:
                # print(out)
                c = translate_text(c, 'en')
            out = "{}\n{}".format(out, c)
    # if natural:
    #     # print(out)
    #     out = translate_text(out, 'en')
    return out

# fixme render markdown to html


# "Write a short paragraph pitch why I need a VPN inside {COUNTRY_NAME}. List specific top security issues and app and content access issues. Do not mention any other VPNs. Do not mention anything about government laws or illegal activity. Add links to websites for services. Add links inline markdown.".format(
#                             COUNTRY_NAME="Brazil")

# https://www.framer.com/academy/lessons/csv-import
"""
Write a short paragraph pitch why I need a VPN inside United Kingdom. List specific top security issues and app and content access issues. Do not mention any other VPNs. Do not mention anything about government laws or illegal activity. Add links to websites for services. Add links inline markdown.

Write a two paragraph pitch why I need a VPN to access apps and content inside United Kingdom from another country. List specific top apps and top content. Do not mention any other VPNs. Add links to websites for services. Add links inline markdown.

Write a short paragraph pitch that asserts URnetwork unique architecture avoids other top issues that users have reported when using a VPN inside United Kingdom.


In three paragraphs, describe to an online viewer the streaming live sports, streaming tv, and online shopping available in United Kingdom. Add links to websites for services. Add links inline markdown.

In a paragraph, describe the main consumer privacy laws and internet freedom laws in the United Kingdom. Add links inline markdown.
"""


# TODO generate in spanish, then translate back to english
# https://codelabs.developers.google.com/codelabs/cloud-translation-python3#2



# def print_supported_languages(display_language_code: str):
#     client = translate.TranslationServiceClient()

#     response = client.get_supported_languages(
#         parent=google_project,
#         display_language_code=display_language_code,
#     )

#     languages = response.languages
#     print(f" Languages: {len(languages)} ".center(60, "-"))
#     for language in languages:
#         language_code = language.language_code
#         display_name = language.display_name
#         print(f"{language_code:10}{display_name}")

def translate_text(text: str, target_language_code: str) -> translate.Translation:
    client = translate.TranslationServiceClient()

    response = client.translate_text(
        parent=google_project,
        contents=[text],
        target_language_code=target_language_code,
    )

    return response.translations[0].translated_text



country_code_color_hexes = {
    "is": "639A88", "ee": "78C0E0", "ca": "449DD1", "de": "663F46", "au": "F29E4C",
    "us": "BAC5B3", "gb": "F1789B", "jp": "CC3363", "ie": "7EE081", "fi": "F56E48",
    "nl": "F56E48", "se": "A4C4F4", "fr": "A864DC", "it": "F9F871", "dk": "D6E6F4",
    "no": "BCE5DC", "be": "9B4A91", "at": "FFCB68", "ch": "FFABA0", "nz": "008A64",
    "pt": "248C89", "es": "B41F43", "lv": "EEE8A9", "lt": "8179E0", "cz": "99E8CE",
    "si": "FF6C58", "sk": "87FB67", "pl": "D38B5D", "hu": "FF8484", "hr": "99B2DD",
    "ro": "C6362F", "bg": "A1CDF4", "gr": "C874D9", "cy": "E1BBC9", "mt": "FFC43D",
    "il": "A9E4EF", "za": "F2B79F", "ar": "8E8DBE", "br": "DCD6F7", "cl": "FA824C",
    "cr": "E07A5F", "uy": "7FDEFF", "jm": "7B886F", "tt": "0072BB", "gh": "1098F7",
    "ke": "F2EDEB", "ng": "64113F", "tn": "6B4D57", "sn": "596869", "na": "813405",
    "bw": "D45113", "mu": "60E1E0", "mg": "F25D72", "in": "F2E2D2", "kr": "C320D9",
    "tw": "E6EA23", "my": "3A1772", "ph": "B4CEB3", "id": "586189", "mn": "A6A57A",
    "ge": "679436", "am": "F2B5D4", "ua": "00F28D", "md": "7F675B", "me": "E5FFDE",
    "rs": "FF495C", "al": "E4B363",
}

def get_color_hex(code: str) -> str:
    """
    Gets the color hex for a given country code.

    Args:
      code: The country code.

    Returns:
      The color hex.
    """
    if code in country_code_color_hexes:
        return country_code_color_hexes[code]

    # Fallback if color hex isn't found, generate a new one by mixing two colors together
    keys = list(country_code_color_hexes.keys())
    keys.sort()

    index1 = get_hash_index(code, len(keys))
    index2 = get_hash_index(code + "salt", len(keys))

    color1 = country_code_color_hexes[keys[index1]]
    color2 = country_code_color_hexes[keys[index2]]

    return mix_colors(color1, color2)

def get_hash_index(id: str, mod: int) -> int:
    """
    Gets a consistent index from the id.

    Args:
      id: The id.
      mod: The modulus.

    Returns:
      The index.
    """
    h = hashlib.md5(id.encode()).digest()
    return h[0] % mod

def mix_colors(color1: str, color2: str) -> str:
    """
    Mixes two colors together.

    Args:
      color1: The first color.
      color2: The second color.

    Returns:
      The mixed color.
    """
    r1, g1, b1 = hex_to_rgb(color1)
    r2, g2, b2 = hex_to_rgb(color2)

    # Mix the colors by averaging their RGB components
    r = (r1 + r2) // 2
    g = (g1 + g2) // 2
    b = (b1 + b2) // 2

    return rgb_to_hex(r, g, b)

def hex_to_rgb(hex_color: str) -> tuple[int, int, int]:
    """
    Converts a hex color to RGB.

    Args:
      hex_color: The hex color.

    Returns:
      The RGB values.
    """
    r = int(hex_color[0:2], 16)
    g = int(hex_color[2:4], 16)
    b = int(hex_color[4:6], 16)
    return r, g, b

def rgb_to_hex(r: int, g: int, b: int) -> str:
    """
    Converts RGB to a hex color.

    Args:
      r: The red value.
      g: The green value.
      b: The blue value.

    Returns:
      The hex color.
    """
    return "{:02x}{:02x}{:02x}".format(r, g, b)



countries = {
    "ad": "Andorra",
"ae": "United Arab Emirates",
"af": "Afghanistan",
"ag": "Antigua and Barbuda",
"ai": "Anguilla",
"al": "Albania",
"am": "Armenia",
"ao": "Angola",
"aq": "Antarctica",
"ar": "Argentina",
"as": "American Samoa",
"at": "Austria",
"au": "Australia",
"aw": "Aruba",
"ax": "\xC5land Islands",
"az": "Azerbaijan",
"ba": "Bosnia and Herzegovina",
"bb": "Barbados",
"bd": "Bangladesh",
"be": "Belgium",
"bf": "Burkina Faso",
"bg": "Bulgaria",
"bh": "Bahrain",
"bi": "Burundi",
"bj": "Benin",
"bl": "Saint Barth\xE9lemy",
"bm": "Bermuda",
"bn": "Brunei Darussalam",
"bo": "Bolivia",
"bq": "Bonaire, Sint Eustatius and Saba",
"br": "Brazil",
"bs": "Bahamas",
"bt": "Bhutan",
"bv": "Bouvet Island",
"bw": "Botswana",
"by": "Belarus",
"bz": "Belize",
"ca": "Canada",
"cc": "Cocos (Keeling) Islands",
"cd": "Democratic Republic of the Congo",
"cf": "Central African Republic",
"cg": "Congo",
"ch": "Switzerland",
"ci": "C\xF4te d'Ivoire",
"ck": "Cook Islands",
"cl": "Chile",
"cm": "Cameroon",
"cn": "China",
"co": "Colombia",
"cr": "Costa Rica",
"cu": "Cuba",
"cv": "Capo Verde",
"cw": "Cura\xE7ao",
"cx": "Christmas Island",
"cy": "Cyprus",
"cz": "Czechia",
"de": "Germany",
"dj": "Djibouti",
"dk": "Denmark",
"dm": "Dominica",
"do": "Dominican Republic",
"dz": "Algeria",
"ec": "Ecuador",
"ee": "Estonia",
"eg": "Egypt",
"eh": "Western Sahara",
"er": "Eritrea",
"es": "Spain",
"et": "Ethiopia",
"fi": "Finland",
"fj": "Fiji",
"fk": "Falkland Islands (Malvinas)",
"fm": "Micronesia",
"fo": "Faroe Islands",
"fr": "France",
"ga": "Gabon",
"gb": "Great Britain",
"gd": "Grenada",
"ge": "Georgia",
"gf": "French Guiana",
"gg": "Guernsey",
"gh": "Ghana",
"gi": "Gibraltar",
"gl": "Greenland",
"gm": "Gambia",
"gn": "Guinea",
"gp": "Guadeloupe",
"gq": "Equatorial Guinea",
"gr": "Greece",
"gs": "South Georgia and the South Sandwich Islands",
"gt": "Guatemala",
"gu": "Guam",
"gw": "Guinea-Bissau",
"gy": "Guyana",
"hk": "Hong Kong",
"hm": "Heard Island and McDonald Islands",
"hn": "Honduras",
"hr": "Croatia",
"ht": "Haiti",
"hu": "Hungary",
"id": "Indonesia",
"ie": "Ireland",
"il": "Israel",
"im": "Isle of Man",
"in": "India",
"io": "British Indian Ocean Territory",
"iq": "Iraq",
"ir": "Iran",
"is": "Iceland",
"it": "Italy",
"je": "Jersey",
"jm": "Jamaica",
"jo": "Jordan",
"jp": "Japan",
"ke": "Kenya",
"kg": "Kyrgyzstan",
"kh": "Cambodia",
"ki": "Kiribati",
"km": "Comoros",
"kn": "Saint Kitts and Nevis",
"kp": "North Korea",
"kr": "South Korea",
"kw": "Kuwait",
"ky": "Cayman Islands",
"kz": "Kazakhstan",
"la": "Lao People's Democratic Republic",
"lb": "Lebanon",
"lc": "Saint Lucia",
"li": "Liechtenstein",
"lk": "Sri Lanka",
"lr": "Liberia",
"ls": "Lesotho",
"lt": "Lithuania",
"lu": "Luxembourg",
"lv": "Latvia",
"ly": "Libya",
"ma": "Morocco",
"mc": "Monaco",
"md": "Moldova",
"me": "Montenegro",
"mf": "Saint Martin (French part)",
"mg": "Madagascar",
"mh": "Marshall Islands",
"mk": "North Macedonia",
"ml": "Mali",
"mm": "Myanmar",
"mn": "Mongolia",
"mo": "Macao",
"mp": "Northern Mariana Islands",
"mq": "Martinique",
"mr": "Mauritania",
"ms": "Montserrat",
"mt": "Malta",
"mu": "Mauritius",
"mv": "Maldives",
"mw": "Malawi",
"mx": "Mexico",
"my": "Malaysia",
"mz": "Mozambique",
"na": "Namibia",
"nc": "New Caledonia",
"ne": "Niger",
"nf": "Norfolk Island",
"ng": "Nigeria",
"ni": "Nicaragua",
"nl": "Netherlands",
"no": "Norway",
"np": "Nepal",
"nr": "Nauru",
"nu": "Niue",
"nz": "New Zealand",
"om": "Oman",
"pa": "Panama",
"pe": "Peru",
"pf": "French Polynesia",
"pg": "Papua New Guinea",
"ph": "Philippines",
"pk": "Pakistan",
"pl": "Poland",
"pm": "Saint Pierre and Miquelon",
"pn": "Pitcairn",
"pr": "Puerto Rico",
"ps": "Palestine",
"pt": "Portugal",
"pw": "Palau",
"py": "Paraguay",
"qa": "Qatar",
"re": "R\xE9union",
"ro": "Romania",
"rs": "Serbia",
"ru": "Russia",
"rw": "Rwanda",
"sa": "Saudi Arabia",
"sb": "Solomon Islands",
"sc": "Seychelles",
"sd": "Sudan",
"se": "Sweden",
"sg": "Singapore",
"sh": "Saint Helena, Ascension and Tristan da Cunha",
"si": "Slovenia",
"sj": "Svalbard and Jan Mayen",
"sk": "Slovakia",
"sl": "Sierra Leone",
"sm": "San Marino",
"sn": "Senegal",
"so": "Somalia",
"sr": "Suriname",
"ss": "South Sudan",
"st": "Sao Tome and Principe",
"sv": "El Salvador",
"sx": "Sint Maarten (Dutch part)",
"sy": "Syrian Arab Republic",
"sz": "Eswatini",
"tc": "Turks and Caicos Islands",
"td": "Chad",
"tf": "French Southern Territories",
"tg": "Togo",
"th": "Thailand",
"tj": "Tajikistan",
"tk": "Tokelau",
"tl": "Timor-Leste",
"tm": "Turkmenistan",
"tn": "Tunisia",
"to": "Tonga",
"tr": "Turkey",
"tt": "Trinidad and Tobago",
"tv": "Tuvalu",
"tw": "Taiwan",
"tz": "Tanzania",
"ua": "Ukraine",
"ug": "Uganda",
"uk": "United Kingdom",
"um": "United States Minor Outlying Islands",
"us": "United States",
"uy": "Uruguay",
"uz": "Uzbekistan",
"va": "Vatican City",
"vc": "Saint Vincent and the Grenadines",
"ve": "Venezuela",
"vg": "British Virgin Islands",
"vi": "U.S. Virgin Islands",
"vn": "Vietnam",
"vu": "Vanuatu",
"wf": "Wallis and Futuna",
"ws": "Samoa",
"ye": "Yemen",
"yt": "Mayotte",
"za": "South Africa",
"zm": "Zambia",
"zw": "Zimbabwe"
}

top_country_codes = [
    "us",  # United States
    "cn",  # China
    "jp",  # Japan
    "de",  # Germany
    "in",  # India
    "uk",  # United Kingdom
    "fr",  # France
    "ru",  # Russia
    "ca",  # Canada
    "it",  # Italy
    "br",  # Brazil
    "kr",  # South Korea
    "au",  # Australia
    "mx",  # Mexico
    "es",  # Spain
    "id",  # Indonesia
    "nl",  # Netherlands
    "sa",  # Saudi Arabia
    "tr",  # Turkey
    "ch",  # Switzerland
    "pl",  # Poland
    "tw",  # Taiwan
    "se",  # Sweden
    "be",  # Belgium
    "th",  # Thailand
    "ng",  # Nigeria
    "ir",  # Iran
    "ae",  # United Arab Emirates
    "ar",  # Argentina
    "at",  # Austria
    "no",  # Norway
    "dk",  # Denmark
    "za",  # South Africa
    "ph",  # Philippines
    "hk",  # Hong Kong
    "sg",  # Singapore
    "my",  # Malaysia
    "ie",  # Ireland
    "il",  # Israel
    "co",  # Colombia
    "vn",  # Vietnam
    "eg",  # Egypt
    "pk",  # Pakistan
    "nz",  # New Zealand
    "cl",  # Chile
    "ro",  # Romania
    "bd",  # Bangladesh
    "pt",  # Portugal
    "cz",  # Czech Republic
    "pe",  # Peru
]



def repair_markdown(m):
    return re.sub(r'\]\s+\(([^)]+)\)', '](\\1)', m)


class Section(object):
    country = ""
    header = ""
    body = ""
    def __init__(self, country, header, body):
        self.country = country
        self.header = header
        self.body = body

    def body_as_html(self, connect_links=True):
        repaired_body = repair_markdown(self.body)

        html = markdown.markdown(repaired_body)
        if connect_links:
            def f(m):
                # framer cms does not suppport relative links with query params
                # use the absolute url
                # see https://www.framer.community/c/support/bug-cms-rich-text-stripping-query-parameter-from-links
                return 'href="https://ur.io/c?{}&target={}"'.format(
                    urllib.parse.quote(self.country.lower()),
                    urllib.parse.quote_plus(re.sub(r'http://', r'https://', m.group(1)))
                )
            html = re.sub(r'href="(https?://[^"]+)"', f, html)
        return html


ordered_items = [
    (country_code, countries[country_code])
    for country_code in top_country_codes
]
ordered_items += sorted(
    [
        (country_code, country)
        for (country_code, country) in countries.items()
        if country_code not in top_country_codes
    ],
    key=lambda t: t[1],
)


with open("out.csv", "w") as f:

    w = csv.writer(f, quoting=csv.QUOTE_ALL)
    header_row = ["Custom Slug", "Title", "Country Name", "Country Code", "Tint"]
    for i in range(0, 5):
        header_row += ["Title{}".format(i + 1), "Section{}".format(i + 1)]
    w.writerow(header_row)
    print(header_row)

    for (country_code, country) in ordered_items:

        sections = [
            Section(
                country,
                "Hello {country} from URnetwork! Why do you need a VPN?".format(country=country),
                claude("Write a short paragraph pitch why I need a VPN inside {country}. List specific top geo-fencing and content access issues. Do not mention any other VPNs. Do not mention anything about government laws or illegal activity. Add links to websites for services. Add links inline markdown.".format(country=country)) + 
                "\n" +
                claude("Give a short paragraph pitch on why it is normal for a person in {country} to use a VPN or ad blocker. Use statistics about other people in {country}. Make people feel normal for wanting to use a VPN or ad blocker.".format(country=country))
            ),
            Section(
                country,
                "Hello world from URnetwork in {country}! Why do you need a VPN to access {country}?".format(country=country),
                claude("Write a two paragraph pitch why I need a VPN to access apps and content inside {country} from another country. List specific top apps and top content. Do not mention any other VPNs. Add links to websites for services. Add links inline markdown.".format(country=country))
            ),
            Section(
                country,
                "How is URnetwork optimized for {country}?".format(country=country),
                claude("Write a short paragraph pitch that asserts URnetwork unique architecture avoids other top issues that users have reported when using a VPN inside {country}.".format(country=country))
            ),
            Section(
                country,
                "What should I browse in {country}?".format(country=country),
                claude("In three paragraphs, describe to an online viewer the streaming live sports, streaming tv, and online shopping available in {country}. Add links to websites for services. Add links inline markdown.".format(country=country))
            ),
            Section(
                country,
                "How is Consumer Privacy and Internet Freedom in {country}?".format(country=country),
                claude("In a paragraph, describe the main consumer privacy laws and internet freedom laws in the {country}. Add links inline markdown.".format(country=country))
            ),
        ]

        country_slug = re.sub(r'\s+', '-', country.lower())
        slug = 'vpn-access-in-{}'.format(country_slug)
        title = 'VPN Access In {}'.format(country)
        country_color_hex = "#{}".format(get_color_hex(country_code))

        row = [slug, title, country, country_code, country_color_hex]
        for section in sections:
            row += [section.header, section.body_as_html()]
        w.writerow(row)
        print(row)

