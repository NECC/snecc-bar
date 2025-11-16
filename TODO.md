# TODO for Adding Total Deposit Value

- [x] Add totalDeposits state variable in admin page
- [x] Add getTotalDeposits and setTotalDeposits functions in lib/auth.ts
- [x] Update handleAddBalance to increment totalDeposits
- [x] Display totalDeposits in the Necc tab
- [x] Load totalDeposits on page load

# Additional Fixes Applied

- [x] Made getProducts() async in admin page loadData function
- [x] Made product loading async in main vending machine page
- [x] Added fallback image handling for products in vending machine

# TODO for Migrating Transactions to Supabase

- [x] Update getTransactions() to fetch from Supabase with localStorage fallback
- [x] Update addTransaction() to insert into Supabase with localStorage fallback
- [x] Make loadData in admin page await getTransactions()
- [x] Make addTransaction async in vending machine completePurchase
