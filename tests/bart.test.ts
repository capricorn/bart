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