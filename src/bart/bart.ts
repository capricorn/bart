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

    export namespace Parser {
        export class StringCombinator {
            combinator: string
            strings: string[]
            // If there is a nested combinator it is pointed to here
            child?: StringCombinator

            constructor(
                combinator: string,
                strings: Lexer.Token[],
                child?: StringCombinator
            ) {
                this.combinator = combinator;
                this.strings = strings.map(s => s.value);
                this.child = child;
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

        export function parseStringCombinator(
            tokens: Bart.Lexer.Token[]
        ): [result: StringCombinator, remainingTokens: Bart.Lexer.Token[]] {
            // If the first element is a string, implicit & combinator
            // Otherwise, consume tokens until.. consume given predicate..?

            // TODO: Handle nested combinator
            // (Important to verify it's a string combinator, not filter combinator)
            let combinator = '&';
            if (Lexer.isCombinator(tokens[0].value)) {
                combinator = tokens[0].value;
                tokens = tokens.slice(1);
            }

            let [consumed, remaining] = consume(
                tokens,
                (token) => { 
                    return Lexer.isString(token.value) 
                }, 
            )

            // Create a string combinator from `consumed`
            return [ new StringCombinator(combinator, consumed), remaining ];
        }
    }
} 

// TODO: Is this ok?
export { Bart }