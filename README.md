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