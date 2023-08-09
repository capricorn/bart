/**
 * 
 * Filter
 * FilterArg
 * StringArg
 * StringCombinator
 * 
 * 
 * Filter (StringCombinator)* StringArg
 * 
 * Maybe just start with string arg
 * 
 * | "abc " "xyz" "123" ; implicit combinator
 * 
 * StringCombinator String String
 * 
 * Note: Combinator classification depends on immediate following arg
 */

// First step: tokenize

namespace Bart {
    export interface Tab {
        title: string
        url: string
    }

    export type TabFilter = (tab: Tab) => boolean;
    export type StringFilter = (str: string) => boolean;

    export namespace Lexer {
        export class Token {
            start: number;
            end: number;
            type: TokenType;
            value: string;

            constructor(
                start: number,
                end: number,
                type: TokenType,
                value: string
            ) {
                this.start = start;
                this.end = end;
                this.type = type;
                this.value = value;
            }
        }

        enum TokenState {
            QUOTE,
            TOKEN,
            WHITESPACE  // necessary?
        }

        export enum TokenType {
            StringArg,
            Filter,
            Negation,
            Combinator
        }

        export function isString(token: string): boolean {
            return token.startsWith('"') && token.endsWith('"');
        }

        export function isFilter(token: string): boolean {
            return [ 'title', 'url' ].includes(token);
        }

        export function isNegation(token: string): boolean {
            return token == '!';
        }

        export function isCombinator(token: string): boolean {
            return ['|', '&'].includes(token);
        }

        export function tokenize(input: string): string[] {
            /*
            function transition(symbol: string, state?: TokenState): TokenState {
                switch (state as TokenState) {
                    case TokenState.TOKEN:
                        break;
                    case TokenState.QUOTE:
                        break;
                    case TokenState.WHITESPACE:
                        break;
                    case undefined:
                        if (symbol == "\"") {
                            return TokenState.QUOTE;
                        } else if (symbol == " ") {
                            return TokenState.WHITESPACE;
                        } else {
                            return TokenState.TOKEN;
                        }
                }
                // TODO: Remove
                return TokenState.QUOTE;
            }
            */

            // Simple state machine: 
            // - must track token start
            // - have to account for quotes
            var tokenStart = 0;
            var tokenState: TokenState = undefined;
            var tokens: string[] = [];

            for (var i = 0; i < input.length; i++) {
                // State is set for tracking the current parsing context
                if (input[i] == '"') {
                    if (tokenState == TokenState.QUOTE) {
                        // Quote closed; (TODO: Handle escapes?)
                        tokenState = undefined;
                        tokens.push(input.slice(tokenStart, i+1));
                    } else {
                        tokenStart = i;
                        // Can ignore all other inputs
                        tokenState = TokenState.QUOTE;
                    }
                } else if (input[i] == " ") {
                    // Ignore whitespace
                    if (tokenState == TokenState.TOKEN) {
                        // This delineates the end of the token sequence;
                        // slice the token here and return it.
                        tokens.push(input.slice(tokenStart, i));
                        tokenState = undefined;
                    }
                } else {
                    if (tokenState == TokenState.QUOTE) {
                        continue;
                    } else if (tokenState == undefined) {
                        tokenStart = i;
                        tokenState = TokenState.TOKEN;
                    } else if (i == input.length-1) {
                        // End of string -- this is the end of the token
                        tokens.push(input.slice(tokenStart, i+1));
                    }
                }
            }

            return tokens;
        }

        export function lex(input: string) {
            var tokenizedInput = Bart.Lexer.tokenize(input);
            var tokens: Bart.Lexer.Token[] = [];

            // TODO: start/end position included in `tokenize` output
            for (const token of tokenizedInput) {
                if (Bart.Lexer.isString(token)) {
                    tokens.push(new Bart.Lexer.Token(0, 0, Bart.Lexer.TokenType.StringArg, token));
                } else if (Bart.Lexer.isFilter(token)) {
                    tokens.push(new Bart.Lexer.Token(0, 0, Bart.Lexer.TokenType.Filter, token));
                } else if (Bart.Lexer.isNegation(token)) {
                    tokens.push(new Bart.Lexer.Token(0, 0, Bart.Lexer.TokenType.Negation, token));
                } else if (Bart.Lexer.isCombinator(token)) {
                    tokens.push(new Bart.Lexer.Token(0, 0, Bart.Lexer.TokenType.Combinator, token));
                }
            }

            return tokens;
        }

        /*
        export function lexString(token: string): BartString {
        }
        */
    }

    export abstract class PrettyPrint {
        abstract print(): string;
    }

    export namespace Parser {
        export class StringCombinator extends PrettyPrint {
            combinator: string
            strings: string[]
            // If there is a nested combinator it is pointed to here
            children: StringCombinator[]

            constructor(
                combinator: string,
                strings: Lexer.Token[],
                children: StringCombinator[] = []
            ) {
                super();
                this.combinator = combinator;
                this.strings = strings.map(s => s.value);
                this.children = children;
            }

            print(): string {
                let result = `<span class="bart-combinator">${this.combinator}</span>` +
                    ' ' + '<span class="bart-string">' + this.strings.join(' ') + '</span>'
                    + ' ' + this.children.map(c => c.print()).join(' ');

                return result;
            }

            filter(): StringFilter {
                let stringMatcher: StringFilter = (str: string) => {
                    // **TODO: Handle children as part of matches as well**
                    let matches = this.strings.map(s => s.includes(str))

                    // Negation can _only_ bind to a single string
                    if (this.combinator == '!') {
                        return !this.strings[0].includes(str);
                    }

                    for (const child of this.children) {
                        let filter = child.filter();
                        matches.push(filter(str));
                    }

                    if (this.combinator == '&') {
                        return matches.every(a => a);
                    } else {
                        // '|' combinator
                        return matches.some(a => a);
                    }
                };

                return stringMatcher;
            }
        }

        export class Filter extends PrettyPrint {
            type: string
            arg: StringCombinator

            constructor(
                type: string,
                arg: StringCombinator
            ) {
                super();
                this.type = type;
                this.arg = arg;
            }

            print(): string {
                return `<span class="bart-filter">${this.type}</span>` +
                    ' ' + this.arg.print();
            }
        }

        export class FilterCombinator extends PrettyPrint {
            combinator: string
            filters: Filter[]
            child?: FilterCombinator

            constructor(
                combinator: string,
                filters: Filter[],
                child?: FilterCombinator
            ) {
                super();
                this.combinator = combinator;
                this.filters = filters;
                this.child = child;
            }

            print(): string {
                let result = `<span class="bart-combinator">${this.combinator}</span>` 
                    + ' ' + this.filters.map(f => f.print()).join(' ');

                if (this.child != undefined) {
                    result += this.child.print();
                }

                return result;
            }
        }

        export function consume(
            tokens: Bart.Lexer.Token[],
            predicate: (token: Bart.Lexer.Token) => boolean
        ): [consumed: Bart.Lexer.Token[], remaining: Bart.Lexer.Token[]] {
            for (var i = 0; i < tokens.length; i++) {
                if (predicate(tokens[i]) == false) {
                    break;
                }
            }

            return [tokens.slice(0, i), tokens.slice(i)];
        }

        // TODO
        export function isStringCombinatorSequence(tokens: Lexer.Token[]): boolean {
            if (tokens.length == 0) {
                return false;
            }

            // First case, implicit '&'
            return Lexer.isString(tokens[0].value) 
                || (Lexer.isCombinator(tokens[0].value) && Lexer.isString(tokens[1].value));
        }

        export function isStringNegationSequence(tokens: Lexer.Token[]): boolean {
            if (tokens.length < 2) {
                return false;
            }

            return tokens[0].value == '!' && Lexer.isString(tokens[1].value);
        }

        export function isFilterCombinatorSequence(tokens: Lexer.Token[]): boolean {
            return Lexer.isCombinator(tokens[0].value) && Lexer.isFilter(tokens[1].value);
        }

        // TODO
        export function consumeStringNegation(
            tokens: Lexer.Token[]
        ): [result: StringCombinator, remaining: Lexer.Token[]] {
            let negatedString = tokens[1];
            return [new StringCombinator('!', [negatedString], []), tokens.slice(2) ];
        }

        export function consumeStringCombinator(
            tokens: Lexer.Token[]
        ): [result: StringCombinator, remaining: Lexer.Token[]] {
            let combinator = new StringCombinator('&', [], []);
            if (Lexer.isCombinator(tokens[0].value)) {
                combinator.combinator = tokens[0].value;
                tokens = tokens.slice(1);
            }

            // Iterate tokens here and identify.
            while (tokens.length > 0) {
                if (isStringNegationSequence(tokens)) {
                    // consume, update `tokens` here
                    let [childCombinator, remainder] = consumeStringNegation(tokens);
                    tokens = remainder;
                    combinator.children.push(childCombinator);
                } else if (Lexer.isString(tokens[0].value)) {
                    combinator.strings.push(tokens[0].value);
                    tokens = tokens.slice(1);
                } else if (isStringCombinatorSequence(tokens)) {
                    let [childCombinator, remainder] = consumeStringCombinator(tokens);
                    tokens = remainder;
                    combinator.children.push(childCombinator);
                } else {
                    // Parse error?
                    break;
                }
            }

            return [combinator, tokens];
        }

        export function consumeFilterCombinator(
            tokens: Lexer.Token[]
        ): [result: FilterCombinator, remainingTokens: Lexer.Token[] ] {
            // Everything left-to-right (starts from the filter)

            let combinatorType = '&';
            if (Lexer.isCombinator(tokens[0].value)) {
                combinatorType = tokens[0].value;
                tokens = tokens.slice(1);
            }

            console.log('remaining tokens: ' + tokens);

            let filters: Filter[] = [];
            let childCombinator: FilterCombinator = undefined;

            while (tokens.length > 0) {
                console.log(tokens);
                console.log(tokens[0].value);
                // On each iteration, check if combinator or filter and set tokens after.
                if (Lexer.isFilter(tokens[0].value)) {
                    console.log('handling filter: ' + tokens[0].value);
                    let filterType = tokens[0].value;
                    tokens = tokens.slice(1);

                    // Consume filter args; loop until all filters are consumed.
                    // Stuck here
                    let [filterArg, remainder] = consumeStringCombinator(tokens);
                    tokens = remainder;
                    console.log('filter remaining tokens: ' + tokens[0]);
                    filters.push(new Filter(filterType, filterArg));
                } else if (isFilterCombinatorSequence(tokens)) {
                    let [filterCombinator, remainder] = consumeFilterCombinator(tokens);
                    filterCombinator.child = filterCombinator;
                    // Should have consumed all tokens here
                    tokens = remainder;
                    break;
                } else {
                    // TODO: Parse error
                }
            }

            // TODO
            return [ new FilterCombinator(combinatorType, filters, childCombinator), [] ];
        }

        export function parseStringCombinator(
            tokens: Bart.Lexer.Token[]
        ): [result: StringCombinator, remainingTokens: Bart.Lexer.Token[]] {
            return consumeStringCombinator(tokens);
        }

        export function highlight(root: FilterCombinator) {
        }
    }

    export namespace Interpreter {
        /*
        export function interpretStringCombinator(): TypeFilter {
        }
        */
    }
} 

// TODO: Is this ok?
export { Bart }