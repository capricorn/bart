# bart

`bart` is a chrome extension for managing browser tabs. It consists of a UI and a query language.

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