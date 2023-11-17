import { Util } from 'src/bart/util';
import { Bart } from 'src/bart/bart';

/*
test('lazy decorator test', () => {
    let test = new Util.TestClass();

    expect(test.example).toBe(undefined);
});
*/

test('[Util] Test async minimal', async () => {
    let arr = [1,4,2,5];
    let comparator: Util.AsyncComparator<number> = async (a,b) => {
        return a < b;
    };

    let result = await Util.asyncMinimal(arr, comparator);
    expect(result).toBe(1);
});

test('[Util] Test async arg minimal', async () => {
    let arr = [1,1,1,3,0,5];
    let comparator: Util.AsyncComparator<number> = async (a,b) => {
        return a < b;
    };

    let result = await Util.asyncArgMinimal(arr, comparator);
    expect(result).toBe(4);
});

test('[Util] Test async sort', async () => {
    let arr = [1,1,1,3,0,5];
    let comparator: Util.AsyncComparator<number> = async (a,b) => {
        return a < b;
    };

    let result = await Util.asyncSort(arr, comparator);
    expect(result).toStrictEqual([0,1,1,1,3,5]);
});

test('uniq state test', async () => {
    let context = new Bart.TabContext();
    let ast = Bart.Parser.parse('uniq "id"', context);

    let filter = ast.filter.filter();
    //console.log('Filter: ' + ast.filter.print());
    let tab1 = new Bart.DummyTab('title1', 'url1', 0, 0);
    let tab2 = new Bart.DummyTab('title1', 'url1', 0, 1);

    //console.log(ast.filter.filters);
    // Proof that state is preserved.
    expect(await filter(tab1, context)).toBe(true);
    expect(await filter(tab1, context)).toBe(false);
    expect(await filter(tab2, context)).toBe(true);
    expect(await filter(tab2, context)).toBe(false);
});

test('uniq test url field', async () => {
    let context = new Bart.TabContext();
    let ast = Bart.Parser.parse('uniq "url"', context);

    let filter = ast.filter.filter();
    let tab1 = new Bart.DummyTab('title1', 'url1', 0, 0);
    let tab2 = new Bart.DummyTab('title1', 'url1', 0, 1);
    let tab3 = new Bart.DummyTab('title1', 'url2', 0, 1);

    expect(tab1['url']).toBe('url1');

    // Proof that state is preserved.
    expect(await filter(tab1, context)).toBe(true);
    expect(await filter(tab2, context)).toBe(false);
    expect(await filter(tab3, context)).toBe(true);
});