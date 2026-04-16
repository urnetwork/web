PLAN

This plan will create a docs explorer that renders the contents of the docs dir and also translates the api docs from build/api.html into a react format with consistent style.

DESIGN GOALS

1. The docs should be a section in the header, and open a new docs explorer page at /docs
2. The docs explorer should contain a sidebar with all the available markdown docs in the docs dir. Tapping a doc should open /docs/<name> and render the contents of the markdown in a simple and elegant format.
3. The docs explorer should have an API section at the top that opens to /api that converts the API docs rendered at build/api.html to a react component in a consistent style to the other components and site.
4. The docs should have a local search that searches the docs markdown as well as the api. Tapping a search result should go to the relevant /docs/<name> or /api section.
5. Format the API page so that a sample input and output JSON float next to each route. Add a table of contents of all the routes to the top of the API docs. Collapse the request body and responses section by default and allow them to be expanded.

IMPLEMENTATION

1. Read the react project in the react dir and make simple and elegant changes.
2. Read the docs in the docs dir and convert each markdown file to a documentation entry in the docs explorer page
3. Read the rendered api at build/api.html which was rendered from the OpenAPI file at build/bringyour.yml and convert it to a simple and elegant react structure consistent with the exsiting react site
