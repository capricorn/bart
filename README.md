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

## EBNF

```ebnf
Command = "." | "bm";
Combinator = "&" | "|";
FilterName = "url" | "title" | "curr";

StringCombinator 
= string
| [(Combinator | "!")], StringCombinator, {StringCombinator};

Filter = FilterName, StringCombinator;
FilterCombinator = [Combinator], Filter, {Filter}, [FilterCombinator];

Root = [Command], [FilterCombinator];
```