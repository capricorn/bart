import { Bart } from 'src/bart/bart';

export {};

test('Test tokenization of input', () => {
    let results = Bart.Lexer.tokenize('"abc 123"  "xyz"    999  777');
    expect(results).toEqual(['"abc 123"', '"xyz"', '999', '777']);
});

test('Test lexing of input containing strings', () => {
    let results = Bart.Lexer.lex('"xyz" "asdf"');
    expect(results).toEqual([
        new Bart.Lexer.Token(0, 0, Bart.Lexer.TokenType.StringArg, '"xyz"'),
        new Bart.Lexer.Token(0, 0, Bart.Lexer.TokenType.StringArg, '"asdf"')
    ]);
});

test('Test lexing of input containing a filter', () => {
    let results = Bart.Lexer.lex('url "xyz"');
    expect(results).toEqual([
        new Bart.Lexer.Token(0, 0, Bart.Lexer.TokenType.Filter, 'url'),
        new Bart.Lexer.Token(0, 0, Bart.Lexer.TokenType.StringArg, '"xyz"')
    ]);
});

test('Test lexing of input containing negation', () => {
    let results = Bart.Lexer.lex('url ! "xyz"');
    expect(results).toEqual([
        new Bart.Lexer.Token(0, 0, Bart.Lexer.TokenType.Filter, 'url'),
        new Bart.Lexer.Token(0, 0, Bart.Lexer.TokenType.Negation, '!'),
        new Bart.Lexer.Token(0, 0, Bart.Lexer.TokenType.StringArg, '"xyz"')
    ]);
});

test('Test lexing of input containing combinator', () => {
    let results = Bart.Lexer.lex('| url & "xyz" "ijk"');
    expect(results).toEqual([
        new Bart.Lexer.Token(0, 0, Bart.Lexer.TokenType.Combinator, '|'),
        new Bart.Lexer.Token(0, 0, Bart.Lexer.TokenType.Filter, 'url'),
        new Bart.Lexer.Token(0, 0, Bart.Lexer.TokenType.Combinator, '&'),
        new Bart.Lexer.Token(0, 0, Bart.Lexer.TokenType.StringArg, '"xyz"'),
        new Bart.Lexer.Token(0, 0, Bart.Lexer.TokenType.StringArg, '"ijk"'),
    ]);
});

test('Test consume given a predicate', () => {
    let tokens = [
        new Bart.Lexer.Token(0, 0, Bart.Lexer.TokenType.StringArg, '"xyz"'),
        new Bart.Lexer.Token(0, 0, Bart.Lexer.TokenType.StringArg, '"ijk"'),
        new Bart.Lexer.Token(0, 0, Bart.Lexer.TokenType.Combinator, '&')
    ];

    let [consumed, remaining] = Bart.Parser.consume(
        tokens,
        (token) => {
            return Bart.Lexer.isString(token.value);
        }
    );

    expect(consumed).toEqual([
        new Bart.Lexer.Token(0, 0, Bart.Lexer.TokenType.StringArg, '"xyz"'),
        new Bart.Lexer.Token(0, 0, Bart.Lexer.TokenType.StringArg, '"ijk"'),
    ]);   

    expect(remaining).toEqual([
        new Bart.Lexer.Token(0, 0, Bart.Lexer.TokenType.Combinator, '&')
    ]);
});

test('Test parse string combinator', () => {
    let tokens = [
        new Bart.Lexer.Token(0, 0, Bart.Lexer.TokenType.Combinator, '|'),
        new Bart.Lexer.Token(0, 0, Bart.Lexer.TokenType.StringArg, '"xyz"'),
        new Bart.Lexer.Token(0, 0, Bart.Lexer.TokenType.StringArg, '"ijk"')
    ];

    let [combinator, remainder] = Bart.Parser.parseStringCombinator(tokens);
    expect(remainder.length).toBe(0);
    expect(combinator.combinator).toBe('|');
    expect(combinator.strings).toEqual(['"xyz"', '"ijk"']);
});

test('Implicit "&" StringCombinator when parsing single string', () => {
    let tokens = [
        new Bart.Lexer.Token(0, 0, Bart.Lexer.TokenType.StringArg, '"ijk"')
    ];

    let [combinator, remainder] = Bart.Parser.parseStringCombinator(tokens);
    expect(combinator.combinator).toBe('&');
    expect(combinator.strings).toEqual(['"ijk"']);
});

test('Consume complex string combinator', () => {
    let query = '"abc" ! "xyz" | "ijk" "ooo"'
    let lex = Bart.Lexer.lex(query);

    let [combinator, remainder] = Bart.Parser.consumeStringCombinator(lex);
    expect(combinator.combinator).toBe('&');
    expect(combinator.strings).toEqual(['"abc"']);
    // A child for negation and a child for the nested OR
    expect(combinator.children.length).toBe(2);
    expect(combinator.children[0].combinator).toBe('!');

    let nestedCombinator = combinator.children[1];
    expect(nestedCombinator.combinator).toBe('|');
    expect(nestedCombinator.strings).toEqual(['"ijk"', '"ooo"']);
});