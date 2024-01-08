namespace Parse {
    // TODO: Create tests for this
    export function concat_tokenize(input: String, transition: (state: string, char: string) => string): String[] {
        let state = "D";
        let tokenStartIdx = 0;
        let tokens: String[] = [];

        for (var i = 0; i < input.length; i++) {
            let char = input[i]
            state = transition(state, char);

            if (state == "D") {
                if (char == " ") {
                    tokens.push(input.slice(tokenStartIdx, i));
                    tokenStartIdx = i+1;
                }
            }

            // TODO: Make sure to handle last token correctly
        }

        if (tokenStartIdx < input.length) {
            tokens.push(input.slice(tokenStartIdx));
        }

        return tokens;
    }


}

export { Parse };