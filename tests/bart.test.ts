import { Bart } from 'src/bart/bart';

export {};

test('Test lexing of quoted strings', () => {
    let results = Bart.Lexer.tokenize('"abc 123"  "xyz"    999  777');
    expect(results).toEqual(['"abc 123"', '"xyz"', '999', '777']);
})
