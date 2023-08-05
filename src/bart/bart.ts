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
        class BartString {
            start: number
            end: number
            value: string
        }

        enum TokenState {
            QUOTE,
            TOKEN,
            WHITESPACE  // necessary?
        }

        export function isString(token: string): boolean {
            return false
        }

        export function tokenize(input: string): String[] {
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
            var tokens: String[] = [];

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

        /*
        export function lexString(token: string): BartString {
        }
        */
    }
} 

// TODO: Is this ok?
export { Bart }

function lex(input: string) {
    // This type of tokenizer will not work with double quotes..
    // So tokenization must be more complex.. (needs to know if in double quotes)
    var tokenizedInput = input
                .replace(/\s+/, " ")
                .split(" ")
    
    // Classify from tokenized input various symbols
    // Iterate over the input. If string, handle

    for (const token of tokenizedInput) {
        if (Bart.Lexer.isString(token)) {
            // attempt to parse here
        }
    }
}