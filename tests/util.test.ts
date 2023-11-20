import { Util } from 'src/bart/util';
import { Bart } from 'src/bart/bart';

// TODO: Add to mocks / tests top-level for import?
class DummyStorage implements Bart.Storage {
    keys: { [key: string]: any };

    constructor() {
        this.keys = {};
    }

    // TODO: Doesn't map exactly with how storage works
    get(key: string): Promise<any> {
        return new Promise(resolver => {
            let obj = {};
            obj[key] = this.keys[key];
            resolver(obj);
        })
    }

    set(items: { [key: string]: any; }): Promise<void> {
        for (const [key,_] of Object.entries(items)) {
            this.keys[key] = items[key];
        }

        return;
    }

    erase(): Promise<void> {
        return;
    }
}

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

test('[Util] Test SortModifier timestamp sort', async () => {
    let context = new Bart.TabContext();
    let storage = new DummyStorage();
    let modifier = new Bart.Parser.SortModifier('timestamp', '<', storage);

    // Tab ids, timestamp
    await storage.set({'1': 100})
    await storage.set({'2': 200})
    await storage.set({'3': 1000})

    let tabs: Bart.DummyTab[] = [
        new Bart.DummyTab('', '', 0, 2),
        new Bart.DummyTab('', '', 0, 3),
        new Bart.DummyTab('', '', 0, 1),
    ];

    let timestampEquator = async (tab1, tab2) => {
        let ts1 = await storage.get(tab1.id+'');
        let ts2 = await storage.get(tab2.id+'');

        return ts1[tab1.id+''] == ts2[tab2.id+''];
    };

    let results = await modifier.sort(tabs, timestampEquator);

    expect(results[0].id).toBe(1);
    expect(results[2].id).toBe(3);

    modifier.relation = '>';
    results = await modifier.sort(tabs);

    expect(results[0].id).toBe(3);
    expect(results[2].id).toBe(1);

    let program = Bart.Parser.parse('sort ">" "timestamp"', context, storage);

    // There should be identical results from the program itself
    results = await program.sortModifier.sort(tabs);

    expect(results[0].id).toBe(3);
    expect(results[2].id).toBe(1);
});

test('uniq state test', async () => {
    let context = new Bart.TabContext();
    let storage = new DummyStorage();
    let ast = Bart.Parser.parse('uniq "id"', context, storage);

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
    let storage = new DummyStorage();
    let ast = Bart.Parser.parse('uniq "url"', context, storage);

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