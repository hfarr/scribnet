# scribnet :pencil:

Yet Another Notes App

I wanted a note taking app so I could customize how my notes are organized
and add features I either feel are missing or not suited for my needs from
other note apps that I've used.

This is also an exercise in developing and hosting an app long term! For
fun and practice.

## Speedy Start

Tested only on ubuntu, should be portable to any unix-like system.

1. Clone this repository 

    `git clone https://github.com/hfarr/scribnet`
    
    `git clone git@github.com:hfarr/scribnet.git`

1. Enter the direcotry `cd scribnet`

1. Install modules `npm i`

    <details>
      <summary>Direct Dependencies & Explanation</summary>

      * [Eleventy](https://www.11ty.dev)—Static site generator. Used to rendering templates (`views/**`) and arrange the output site.

        Congrats to 11ty on 1.0.0

      * [Express](https://expressjs.com/)—Node web server. Provides an API for content and managing that content behind the scenes. 
    
        At the moment no server side rendering. Dynamic content is loaded at build time and inserted into templates. Content that changes over the course of the runtime will be available from the same APIs and dynamically updated by clientside code, only volatile information will be exchanged with the server (i.e as much as possible will be templated, the server will provide data but not rendered pages).

      * [Axios](https://axios-http.com/docs/intro)—Client & Server http requests.

        Subject to replacement by the standard fetch API, most likely dependency to change.
    </details>

1. Build the site. Two options for this, either load build-time content or generate just the static content. A wily third option exists for the enterprising developer (load dynamic content when the server is available, otherwise build without it).

    (Option 1) Run with dynamic build time content (fetch from the server)

    1. Start the backend `npm run server`

        The server binds to `localhost:3000`. Right now this can't be changed with runtime options but feel free to poke at the code.

    1. Build the site `npm run build`.

    1. Check it out at `localhost:3000`

    (Option 2) Build only the static content

    1. Execute `npm run build-serve`. Eleventy builds the content and starts a light webserver, without touching the backend for this project.
    
        It also rebuilds whenever files in `views/` are updated.

    1. Visit the site `localhost:8080`. Optionally you can run the backend and visit `localhost:3000`.

1. Interesting pages (TODO)

    Most of the demonstrable content exists under `/dev/` (if the build succeeded you can see the output files in `/site/dev`). Links! Swap out the port with 8080 if you're hosting with the built in eleventy development webserver.

    * [/dev/editor](http://localhost:3000) A demo of a development view of the internal editor state. On the page are the "editor" (`editor-hf` custom component), a label ()
        
        The first "demo" page, has been consistently updated as features changed. As a result it doesn't capture the full scope of features, eventually I outgrew
    * [/dev/editor](http://localhost:3000):
    * [/dev/editor](http://localhost:3000):
    * [/dev/editor](http://localhost:3000):



