changequote(`<?', `?>')dnl
# bart

`bart` is a chrome extension for managing browser tabs. It consists of a UI and a query language.

## Install

- In chrome, navigate to [chrome://extensions/](chrome://extensions/).
- Enable 'Developer Mode' in the top-right corner.

Next, in a terminal:

```bash
$ git clone 'git@github.com:capricorn/bart.git'
$ cd bart
$ npm install
$ npm run build
```

- Switch back to [chrome://extensions](chrome://extensions). 
- Click 'Load unpacked' in the top-left corner.
- Select the `bart/dist` directory. 

`bart` is now accessible from the 'Extensions' chrome toolbar button.

## bart query language

### Empty query

If no query is present, every tab is filtered.

### Filters

If a query is not empty it must contain at least one filter.
A filter is a predicate applied to some field of a tab, e.g. title.

Example: filtering all tabs for `google.com`:

```
url "google.com"
```

N.B. Filters that operate on tab string fields (e.g. `title`) filter with `String.contains`.  
N.B. String comparison is case insensitive; strings are made lowercase before comparison.

#### Available filters

```
// Filter tabs with url containing the string arg
url "url_to_match"
// Filter tabs with title containing the string arg
title "title_to_match"
// Filter tabs to the current window
curr
// Filter tabs to tabs selected in UI
$
```

## EBNF

```ebnf
include(<?bart.ebnf?>)
```