export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
	public: {
		Tables: {
			inventory_items: {
				Row: {
					id: string;
					barcode: string;
					name: string;
					qty_in_warehouse: number | null;
					quantity_on_hand: number | null;
					created_at: string | null;
				};
				Insert: {
					barcode: string;
					name: string;
					qty_in_warehouse?: number | null;
					quantity_on_hand?: number | null;
					created_at?: string | null;
				};
				Update: {
					id?: string;
					barcode?: string;
					name?: string;
					qty_in_warehouse?: number | null;
					quantity_on_hand?: number | null;
					created_at?: string | null;
				};
			};
			// ... Add other tables as needed ...
		};
		Views: {};
		Functions: {};
		Enums: {};
	};
}
