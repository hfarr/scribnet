# Changelog

## Alpha 0.0.2 2022-05-14

Features
—

Enhancement:
* Login redirection
  * Visiting an app page when you aren't logged in redirects you to login automatically
  * Logging in after such a redirect will redirect you to the original page you tried to visit
* Security
  * Session cookies now have the 'secure' attribute, to reduce the change someone can swipe your session
* Session persistence
  * Sessions will now persist for up to one week of inactivity
  * Visiting the app within that week resets the session (hopefully)

## Alpha 0.0.1 2022-04-24

Features
—

Functionality
* Expanded the "Scribdoc" document structuring microlanguage 
  * Support Segment tags
  * Add escape character, backslash, supporting two escape sequences. One for backslashes one for single quotes.
* Updated serialization to use Scribdoc over JSON dump
  * Old format is deprecated but still present in the code
  * Supports bridging from the old version to the new version but no automatic migration
* Add automatic login env variable (not for use in production!)

Bug fixes
* HTMLRenderer not escaping HTML sensitive characters
* Section `eq` improperly reporting sections as equal if atoms of one is the prefix of the others atoms

## Alpha 0.0.0 2022-04-23

First "official" release! Early alpha testing.
Can compile a list of features. At a high level,

* Basic editing
* Content persistence
* Account management (sign up, log in)
  * no "log out" though haha

This is underselling how much it took to get here so I may revisit this with a more detailed list in the future.