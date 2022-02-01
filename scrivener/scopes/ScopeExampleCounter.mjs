'use strict'

import { NamedScope } from "./Scope.mjs";

/*
  We have some different ideas on how the scope API should
  feel to interact with. Importantly, how to expose its
  capabilities, and how to implement them.

  At a mid to highish level, I want to generate Capability
  URLs from a scope as a soft login. Subsequent requests
  retrieve the scope on the server side which then 
  controls access to the requested resource. I'm framing
  the example from the HTTP request implementation since I
  don't have a concrete plan for other implementations, it
  will be made first then generalized as needed. so we'll
  focus down that front, but I will keep the longer term
  design in mind and separate functionality as appropriate
  to avoid mixing decisions made for the HTTP controller
  with what is needed for Scopes.
 */

class Counter {
  constructor() { this.count = 0 }
  incr() { this.count++; }
  set(v) { this.count = v;}
  reset() { this.count = 0; }
}

// Okay- Counter is a Data, then "Author", "Admin" are actually Scopes but I,
// curiously, declared a class for that name. Likely will follow a class model
// for "scope templating" and maybe even "scope inheritance". Want to 
// establish the basics first though!

class Author {  
  // can choose to show or hide views on articles   => can add or remove it from public scope
  // can see views for any article                  => can't hide/show from other authors, or alternatively, higher priveleges than public group
  // has a count of articles written
  // can edit their own articles                    => combined we have a "full access" notion. I'm wary of allowing a "*" to attend this need directly. I think I shall. like. "notes.*""
  // can see their own articles                     => ^    but I'm concerned right now about the primitives, a * is an enhancement (like + is for Regex in a way)
  // can grant special access to an author to
  //    view a (draft) article
  // can publish an article for future viewing
}

// Article is another "Data". What is a bit more complicated,
// but still supported, is mixing "data" and "scopes"- that
// is, modeling account privileges. A User is data but also
// its own "scope"! I will (eventually) accomplish that 
// essential feature of site management by completely 
// distinguishing the scope you have access to from the 
// "User" data. An account amounts to a scope uniquely 
// privileged to access a particular "User"
class Article {
  // has a count of views
  // has content

  constructor() { this.title=""; this.content=""; this.views = new Counter() }
}
// one idea I haven't explored quite yet is different resources
// available under the same names to different scopes. A basic
// example would be paywalled content where you offer a set of
// free articles each X time period, or portion of article,
// publicly. Then a Subscriber has the whole thing. Each can
// visit the same route and retrieve the same data. Scopes can
// cover this concept by binding different values to the same
// names in different scopes, which is also partially how I
// plan to implement "Scope templates". Similar idea but
// stricter principals. Names are not distinguished by the
// privileged amount of access serving varying content, but
// serve the same kind of content to different scopes tied to
// that scope.

class Admin {
  // 
}

// ===============
// Scope proposals
// ---------------
// Set up: How the site content might be arranged
let articles = []

// Direct names, precision
let scopePublic_1 = new NamedScope("Public")
let scopeAuthor_1 = new NamedScope("Author")

scopePublic_1.bind("articles", articles)



// 