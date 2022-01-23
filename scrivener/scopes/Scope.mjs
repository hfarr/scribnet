/**
 * Scope access model
 * 
 * Elevator pitch:
 *  Center access around values & actions that are "in scope". A user with a token to
 *  access a scope can query identifiers and call methods in a "repl" like fashion
 *  that mirrors what would be in the lexical scope of a programin a given block.
 * 
 * Authentication is the process of getting a token for a specific scope (which we call "Access")
 * Authorization is the limits on what you can do within a scope (called "Control")
 *                                                                -> Names TBD frankly
 * 
 * Some notions
 * Scopes form a partially ordered set (POSET). Public scope is at the root and has
 * the smallest subset of accessible properties. Admin scope (or universal scope)
 * is at the top and has access to all identifiers. Scopes can follow an 
 * "inheritance" model, where all scopes inherit from Public and Admin inherits
 * from all scopes. We can also discuss scopes in a "environment" model where the
 * scopes you can access are based on a stack of environment (scope) frames, 
 * starting at the bottom with public, and pushing on additional scopes based on 
 * the amount of access.
 * Since it's a poset we can build a lattice ( I think POSET properties give us the
 * "Top" and "Bottom" elements, but if not then its a special poset that does ).
 * 
 * Example set of scopes
 * 
 *              Admin
 *                |
 *              Manager   
 *              |      \
 *              |       Editor
 *          Author        |
 *             \        posts (write)
 *              \         / 
 *              author.Posts (write, create)
 *                  |
 *                Public
 * 
 * There is hidden complexity, I kept most of the information outside the lattice.
 * These scopes refer to the "blocks" of "lexical scope" that a token holder for
 * that scope has access to. The blocks are defined by identifiers and "actions"
 * that are set (monadic binding (o ).(o ) ) on them. I tried to encode a bit of
 * the possible complexity this model supports. Let's take a look at the "posts"
 * scopes and who has access to what.
 * Public:  
 *    Not present in the chart, but the public has read access to all posts.
 *    we might represent this as Public (posts.read)
 *    we can imagine a separate scope, "published" that holds only the 
 *      visible posts, where other scopes can access yet to be published 
 *      posts or drafts.
 * author.Posts:  
 *    Implication here is that the author is only scoped to posts that they own,
 *    whereas an Editor sits over a scope of "posts (write)" that gives them access
 *    to every post.
 * What's confusing about the above is what the relationship means. I think I do
 * want to encapsulate "inheritance" of a kind but I think the diagram could use
 * some work. For example I didn't put Editor above Author because Editors are not
 * Authors, but in a sense it's not about the "Editor/Author" relationship its
 * about the scopes they cover. If Editor can cover all the scopes an author can
 * then it should be strict inheritance.
 * Another idea is scope templating. An Author's scope is locked to yet another
 * scope, of User, we might say, but the scope modeling is the same. In my model
 * generally this idea would be the same as instancing an author class whenever
 * a scope is provision for an access token. Here's how a scope might look in code
 *  public { 
 *    access posts = posts.filter(p => p.isPublished())
 *    access authors = authors.all.map(author => biography)
 *    authors.forEach( a => access a.get )
 * 
 *    author (x) { // templated. We have a notion of 'identity'
 *      access author = authors.get(x)
 *      // access author.posts = 
 *      // Hmm! I am struggling a bit with representing how we might grant an author access to particulars. We might not let an author do EVERYTHING on, for example, their "remuneration" which sets a commission rate.
 *    }
 * 
 *    editor {  // all editors are the "same" (unless, say, only certain authors have certain editors. Or certain posts have certain editors.)
 *      access posts.all
 *      // What distinguishes this from the public's access declaration for posts? what limits the other, and should the model be of "limiting" (i.e, assume all access, then specify limits) or "granting" (assume nothing, specify an identifier, attach individually each access)
 *    }
 *  }
 * This is enough for me to get the gist of where I'm going and hopefully suffices for
 * others. To be refined.
 * 
 * This particular model says nothing of access control for static pages, it fits into the model
 * too. I'd imagine each "post" in "posts" has a page and that is really what the 
 * public has permission to grab. The trick is mapping routes to the access model
 * (and all other controllers).
 * 
 * Means of resource access (visiting a url, using the command line, editor panel)
 * are vehicles for translating to queries on in-scope values. Scopes determine
 * whether the resource/action can be fetched/taken
 * 
 * on the client side I have grand visions of fetching a scope and automatically
 * sticking all the identifiers into the namespace. Then you can manipulate the
 * code as if you were writing it on the server in that block. That's also where
 * I'm thinking the "repl" mental model fits, it's like you load up a REPL
 * environment pre-set with identifiers from the scope for which you have a 
 * token. You're free to do what you want within that scope, and the scope limits
 * what you can do, like even if you have access to a post you might not have
 * access to post.update, only post.read, or an idea to this affect.
 */