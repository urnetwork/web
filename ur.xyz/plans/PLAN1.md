PLAN

We will convert the react site in the react dir to a well structured react application, add a clean and minimal navigation bar, and add sections to the app.

DESIGN GOALS

1. A clean and minimal navigation header should be shown at the top of the page.
2. The UR simulation component should be shown full bleed under the navigation header when the page launches. As the page scrolls down, the statistics panel should detach from the simulation component and center at the top of the whitepaper section.
3. The whitepaper section will be a statement of facts about the token formatted as clean business style formatting.
4. The sections of the site will be: Whitepaper (the landing page), Research, Providers, Extenders, Usage, and Exchanges.
5. The navigation bar should add the URnetwork logo and the phrase "Own your privacy. Own your network."
6. There should be a simple footer with a "Contact" page link.
7. When the protocol summary stats panel scrolls past the header, a bar should appear under the header that shows the current statistics similar to a stock ticker. The ticker bar height should be the same as the header bar height.
8. The ticker bar should not scroll. The stats should be organized as a label on top and a value below, left aligned. There should be minimal layout movement as the values update. The stats should wrap around and the bar should expand if there is not enough horizontal space.
9. The overview protocol summary stats panel should stick under the header and transition into the ticker bar as the page scrolls. The ticker bar should not be a separate bar that pops down. The protocol summary stats panel should stick and smoothly expand out into the ticker bar as the page scrolls.
10. In the header the Network Operator section should be renamed to the Usage section, and be on the far right as the primary action. To the very right of the header have two sparklines for "$UR/GB" and "$UR/user" costs to use the network. The sparklines should show 24 hours historical costs and be minimal off-white (#F8F8F8). The usage button border should encompass the sparklines also. Tapping anywhere in the button including on the sparklines should go to the usage section. Seed the usage sparklines with 24h of fake data. The usage call to action should be compact with not so much spacing between the usage label and the sparklines. The width of the sparlines should be fixed including the width of the current $UR price. Show the current $UR price rounded to at most 2 decimal places. If the actual value is less than the rounded value, add a "<" prefix. If the actual value is greater than the rounded value, use a ">" prefix.
11. In the footer add a link to GitHub https://github.com/urnetwork. In the footer change the copyright to 2026 BringYour, Inc. In the footer add a disclaimer that this site is an open source utility protocol powered by a community of participants run separately from the network operator that sells access to the network.
12. Support a language selector in the header bar with the following languages: EN, RU, AR, ZH, DE, ES. Support swappable languages in the react components. The default site should be / and each language site should be /<language code>, e.g. /ru. The language links should also be in the footer of the site. Track when the user explicitly sets the language in local storage. On loading of the site, if the user has not explicitly set the language, detect the local language and if there is a matching language available use that language version of the site.

IMPLEMENTATION

1. Retain the color and font styles from the examples/ur.xyz site and the existing react components in the react dir.
2. Analyze examples/ur.xyz and the existing react component in the react dir and make clean and elegant changes.
3. Use placeholder text for the whitepaper and each section. This plan is about creating a beautiful site structure and we will fill in the content in a future plan.
