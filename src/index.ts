export interface CollectionConstructor {
	new (): Collection<unknown, unknown>;
	new <K, V>(entries?: ReadonlyArray<readonly [K, V]> | null): Collection<K, V>;
	new <K, V>(iterable: Iterable<readonly [K, V]>): Collection<K, V>;
	readonly prototype: Collection<unknown, unknown>;
	readonly [Symbol.species]: CollectionConstructor;
}

class Collection<K, V> extends Map<K, V> {
	private _array!: V[] | null;
	private _keyArray!: K[] | null;
	public static readonly default: typeof Collection = Collection;
	public ['constructor']: typeof Collection;

	public constructor(entries?: ReadonlyArray<readonly [K, V]> | null) {
		super(entries);

		/**
		 * Cached array for the `array()` method - will be reset to `null` whenever `set()` or `delete()` are called
		 * @name Collection#_array
		 * @type {?Array}
		 * @private
		 */
		Object.defineProperty(this, '_array', { value: null, writable: true, configurable: true });

		/**
		 * Cached array for the `keyArray()` method - will be reset to `null` whenever `set()` or `delete()` are called
		 * @name Collection#_keyArray
		 * @type {?Array}
		 * @private
		 */
		Object.defineProperty(this, '_keyArray', { value: null, writable: true, configurable: true });
	}

	public get<T extends V>(key: K): T | undefined {
		return <T>super.get(key);
	}

	public set(key: K, value: V): this {
		this._array = null;
		this._keyArray = null;
		return super.set(key, value);
	}

	public has(key: K): boolean {
		return super.has(key);
	}

	public delete(key: K): boolean {
		this._array = null;
		this._keyArray = null;
		return super.delete(key);
	}

	public clear(): void {
		return super.clear();
	}

	public array<T extends V>(): T[] {
		if (this._array?.length !== this.size) this._array = [...this.values()];
		return <T[]>this._array;
	}

	public keyArray(): K[] {
		if (this._keyArray?.length !== this.size) this._keyArray = [...this.keys()];
		return this._keyArray;
	}

	public first<T extends V>(): T | undefined;
	public first<T extends V>(amount: number): T[];
	public first<T extends V>(amount?: number): T | T[] | undefined {
		if (typeof amount === 'undefined') return this.values().next().value;
		if (amount < 0) return this.last<T>(amount * -1);
		amount = Math.min(this.size, amount);
		const iter = this.values();
		return Array.from({ length: amount }, (): T => iter.next().value);
	}

	public firstKey(): K | undefined;
	public firstKey(amount: number): K[];
	public firstKey(amount?: number): K | K[] | undefined {
		if (typeof amount === 'undefined') return this.keys().next().value;
		if (amount < 0) return this.lastKey(amount * -1);
		amount = Math.min(this.size, amount);
		const iter = this.keys();
		return Array.from({ length: amount }, (): K => iter.next().value);
	}

	public last<T extends V>(): T | undefined;
	public last<T extends V>(amount: number): T[];
	public last<T extends V>(amount?: number): T | T[] | undefined {
		const arr = this.array<T>();
		if (typeof amount === 'undefined') return arr[arr.length - 1];
		if (amount < 0) return this.first(amount * -1);
		if (!amount) return [];
		return arr.slice(-amount);
	}

	public lastKey(): K | undefined;
	public lastKey(amount: number): K[];
	public lastKey(amount?: number): K | K[] | undefined {
		const arr = this.keyArray();
		if (typeof amount === 'undefined') return arr[arr.length - 1];
		if (amount < 0) return this.firstKey(amount * -1);
		if (!amount) return [];
		return arr.slice(-amount);
	}

	public random<T extends V>(): T;
	public random<T extends V>(amount: number): T[];
	public random<T extends V>(amount?: number): T | T[] {
		let arr = this.array<T>();
		if (typeof amount === 'undefined') return arr[Math.floor(Math.random() * arr.length)];
		if (!arr.length || !amount) return [];
		arr = arr.slice();
		return Array.from(
			{ length: Math.min(amount, arr.length) },
			(): T => arr.splice(Math.floor(Math.random() * arr.length), 1)[0],
		);
	}

	public randomKey(): K;
	public randomKey(amount: number): K[];
	public randomKey(amount?: number): K | K[] {
		let arr = this.keyArray();
		if (typeof amount === 'undefined') return arr[Math.floor(Math.random() * arr.length)];
		if (!arr.length || !amount) return [];
		arr = arr.slice();
		return Array.from(
			{ length: Math.min(amount, arr.length) },
			(): K => arr.splice(Math.floor(Math.random() * arr.length), 1)[0],
		);
	}

	public find(fn: (value: V, key: K, collection: this) => boolean): V | undefined;
	public find<T extends V>(fn: (this: T, value: T, key: K, collection: this) => boolean, thisArg?: T): T | undefined;
	public find<T extends V>(fn: (value: T, key: K, collection: this) => boolean, thisArg?: unknown): T | undefined {
		if (typeof thisArg !== 'undefined') fn = fn.bind(thisArg);
		for (const [key, val] of this) {
			if (fn(<T>val, key, this)) return <T>val;
		}
		return undefined;
	}

	public findKey(fn: (value: V, key: K, collection: this) => boolean): K | undefined;
	public findKey<T extends V>(fn: (this: T, value: T, key: K, collection: this) => boolean, thisArg?: T): K | undefined;
	public findKey(fn: (value: V, key: K, collection: this) => boolean, thisArg?: unknown): K | undefined {
		if (typeof thisArg !== 'undefined') fn = fn.bind(thisArg);
		for (const [key, val] of this) {
			if (fn(val, key, this)) return key;
		}
		return undefined;
	}

	public sweep(fn: (value: V, key: K, collection: this) => boolean): number;
	public sweep<T extends V>(fn: (this: T, value: T, key: K, collection: this) => boolean, thisArg?: T): number;
	public sweep(fn: (value: V, key: K, collection: this) => boolean, thisArg?: unknown): number {
		if (typeof thisArg !== 'undefined') fn = fn.bind(thisArg);
		const previousSize = this.size;
		for (const [key, val] of this) {
			if (fn(val, key, this)) this.delete(key);
		}
		return previousSize - this.size;
	}

	public filter(fn: (value: V, key: K, collection: this) => boolean): this;
	public filter<T extends V>(fn: (this: T, value: T, key: K, collection: this) => boolean, thisArg?: T): this;
	public filter(fn: (value: V, key: K, collection: this) => boolean, thisArg?: unknown): this {
		if (typeof thisArg !== 'undefined') fn = fn.bind(thisArg);
		const results = new this.constructor[Symbol.species]<K, V>() as this;
		for (const [key, val] of this) {
			if (fn(val, key, this)) results.set(key, val);
		}
		return results;
	}

	public partition(fn: (value: V, key: K, collection: this) => boolean): [this, this];
	public partition<T extends V>(fn: (this: T, value: T, key: K, collection: this) => boolean, thisArg?: T): [this, this];
	public partition(fn: (value: V, key: K, collection: this) => boolean, thisArg?: unknown): [this, this] {
		if (typeof thisArg !== 'undefined') fn = fn.bind(thisArg);
		const results: [this, this] = [
			new this.constructor[Symbol.species]() as this,
			new this.constructor[Symbol.species]() as this,
		];
		for (const [key, val] of this) {
			if (fn(val, key, this)) {
				results[0].set(key, val);
			} else {
				results[1].set(key, val);
			}
		}
		return results;
	}

	public flatMap<T>(fn: (value: V, key: K, collection: this) => Collection<K, T>): Collection<K, T>;
	public flatMap<T, This>(
		fn: (this: This, value: V, key: K, collection: this) => Collection<K, T>,
		thisArg?: This,
	): Collection<K, T>;
	public flatMap<T>(fn: (value: V, key: K, collection: this) => Collection<K, T>, thisArg?: unknown): Collection<K, T> {
		const collections = this.map(fn, thisArg);
		return (new this.constructor[Symbol.species]() as Collection<K, T>).concat(...collections);
	}

	public map<T extends V, R = T>(fn: (value: T, key: K, collection: this) => R): R[];
	public map<This, T>(fn: (this: This, value: V, key: K, collection: this) => T, thisArg: This): T[];
	public map<T extends V, R = T>(fn: (value: T, key: K, collection: this) => R, thisArg?: unknown): R[] {
		if (typeof thisArg !== 'undefined') fn = fn.bind(thisArg);
		const iter = this.entries();
		return Array.from(
			{ length: this.size },
			(): any => {
				const [key, value] = iter.next().value;
				return fn(value, key, this);
			},
		);
	}

	public mapValues<T>(fn: (value: V, key: K, collection: this) => T): Collection<K, T>;
	public mapValues<This, T>(fn: (this: This, value: V, key: K, collection: this) => T, thisArg?: This): Collection<K, T>;
	public mapValues<T>(fn: (value: V, key: K, collection: this) => T, thisArg?: unknown): Collection<K, T> {
		if (typeof thisArg !== 'undefined') fn = fn.bind(thisArg);
		const coll = new this.constructor[Symbol.species]() as Collection<K, T>;
		for (const [key, val] of this) coll.set(key, fn(val, key, this));
		return coll;
	}

	public some(fn: (value: V, key: K, collection: this) => boolean): boolean;
	public some<T>(fn: (this: T, value: V, key: K, collection: this) => boolean, thisArg?: T): boolean;
	public some<T extends V>(fn: (value: T, key: K, collection: this) => boolean, thisArg?: unknown): boolean {
		if (typeof thisArg !== 'undefined') fn = fn.bind(thisArg);
		for (const [key, val] of this) {
			if (fn(<T>val, key, this)) return true;
		}
		return false;
	}

	public every(fn: (value: V, key: K, collection: this) => boolean): boolean;
	public every<T>(fn: (this: T, value: V, key: K, collection: this) => boolean, thisArg?: T): boolean;
	public every<T extends V>(fn: (value: T, key: K, collection: this) => boolean, thisArg?: unknown): boolean {
		if (typeof thisArg !== 'undefined') fn = fn.bind(thisArg);
		for (const [key, val] of this) {
			if (!fn(<T>val, key, this)) return false;
		}
		return true;
	}

	public reduce<T>(fn: (accumulator: T, value: V, key: K, collection: this) => T, initialValue?: T): T {
		let accumulator!: T;

		if (typeof initialValue !== 'undefined') {
			accumulator = initialValue;
			for (const [key, val] of this) accumulator = fn(accumulator, val, key, this);
			return accumulator;
		}
		let first = true;
		for (const [key, val] of this) {
			if (first) {
				accumulator = (val as unknown) as T;
				first = false;
				continue;
			}
			accumulator = fn(accumulator, val, key, this);
		}

		// No items iterated.
		if (first) {
			throw new TypeError('Reduce of empty collection with no initial value');
		}

		return accumulator;
	}

	public each(fn: (value: V, key: K, collection: this) => void): this;
	public each<T>(fn: (this: T, value: V, key: K, collection: this) => void, thisArg?: T): this;
	public each(fn: (value: V, key: K, collection: this) => void, thisArg?: unknown): this {
		this.forEach(fn as (value: V, key: K, map: Map<K, V>) => void, thisArg);
		return this;
	}

	public tap(fn: (collection: this) => void): this;
	public tap<T>(fn: (this: T, collection: this) => void, thisArg?: T): this;
	public tap(fn: (collection: this) => void, thisArg?: unknown): this {
		if (typeof thisArg !== 'undefined') fn = fn.bind(thisArg);
		fn(this);
		return this;
	}

	public clone(): this {
		return new this.constructor[Symbol.species](this) as this;
	}

	public concat(...collections: Collection<K, V>[]): this {
		const newColl = this.clone();
		for (const coll of collections) {
			for (const [key, val] of coll) newColl.set(key, val);
		}
		return newColl;
	}


	public equals(collection: Collection<K, V>): boolean {
		if (!collection) return false; // runtime check
		if (this === collection) return true;
		if (this.size !== collection.size) return false;
		for (const [key, value] of this) {
			if (!collection.has(key) || value !== collection.get(key)) {
				return false;
			}
		}
		return true;
	}

	public sort(
		compareFunction: (firstValue: V, secondValue: V, firstKey: K, secondKey: K) => number = (x, y): number =>
			Number(x > y) || Number(x === y) - 1,
	): this {
		const entries = [...this.entries()];
		entries.sort((a, b): number => compareFunction(a[1], b[1], a[0], b[0]));

		// Perform clean-up
		super.clear();
		this._array = null;
		this._keyArray = null;

		// Set the new entries
		for (const [k, v] of entries) {
			super.set(k, v);
		}
		return this;
	}

	public intersect(other: Collection<K, V>): Collection<K, V> {
		return other.filter((_, k) => this.has(k));
	}

	public difference(other: Collection<K, V>): Collection<K, V> {
		return other.filter((_, k) => !this.has(k)).concat(this.filter((_, k) => !other.has(k)));
	}

	public sorted(
		compareFunction: (firstValue: V, secondValue: V, firstKey: K, secondKey: K) => number = (x, y): number =>
			Number(x > y) || Number(x === y) - 1,
	): this {
		return (new this.constructor[Symbol.species]([...this.entries()]) as this).sort((av, bv, ak, bk) =>
			compareFunction(av, bv, ak, bk),
		);
	}
}

module.exports = Collection;
export { Collection };
export default Collection;
