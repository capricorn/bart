import { Bart } from 'src/bart/bart';

export {};

test('Test lexing of quoted strings', () => {
    let results = Bart.Lexer.tokenize('"abc 123"  "xyz"');
    expect(results).toEqual(['"abc 123"', '"xyz"']);
})
