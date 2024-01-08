import { Parse } from 'src/bart/parser/parse';


test("Lexer test", () => {
    // TODO: Reduce required logic (could just pass tuples and construct from that.)
    let result = Parse.concat_tokenize('abc "x yz"', (state, char) => {
        if (state == "D" && char == '"') {
            return "StringStart";
        }

        if (state == "StringStart" && char == '"') {
            return "D";
        }

        return state;
    });

    expect(result).toStrictEqual(['abc', '"x yz"']);
});