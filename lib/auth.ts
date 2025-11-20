import { supabase } from '@/app/config/supabaseClient'

export interface User {
  id: string
  email: string
  name: string
  balance: number
  isMember: boolean
  role: 'admin' | 'user'
  createdAt: string
}

export interface Order {
  id: string
  userId: string
  userName: string
  total: number
  paymentMethod: 'balance' | 'cash'
  items: Array<{
    productId: string
    productName: string
    quantity: number
    pricePerUnit: number
    subtotal: number
  }>
  timestamp: string
}

export interface Product {
  id: string
  name: string
  image: string
  stock: number
  purchasePrice: number
  sellingPriceMember: number
  sellingPriceNonMember: number
}

export interface Deposit {
  id: string
  userId: string
  amount: number
  method: 'cash' | 'mbway' | 'adjustment'
  timestamp: string
}

// Helper function to check if user is admin (based on role)
export function isAdmin(user: User | null): boolean {
  return user?.role === 'admin'
}


export async function getCurrentUser(): Promise<User | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) {
    console.error('Error fetching user:', error)
    // If user doesn't exist in users table, return null
    if (error.code === 'PGRST116' || error.message?.includes('No rows')) {
      return null
    }
    // For 406 errors, it's likely an RLS issue
    if (error.code === 'PGRST301' || error.message?.includes('406')) {
      console.error('RLS policy issue - user may not have access to users table')
    }
    return null
  }

  if (!data) return null

  return {
    id: data.id,
    email: data.email,
    name: data.name,
    balance: parseFloat(data.balance) || 0,
    isMember: data.is_member || false,
    role: data.role || 'user',
    createdAt: data.created_at,
  }
}

export async function login(email: string, password: string): Promise<User | null> {
  // Clear old sessions first
  await supabase.auth.signOut()

  // Log in
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    console.error('Login failed:', error.message)
    return null
  }

  console.log('Logged in user:', data.user)
  return await getCurrentUser()
}

export async function freshLogin(email: string, password: string) {
  // Clear old session
  await supabase.auth.signOut()

  // Log in fresh
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(error.message)

  return data.user
}

export async function register(email: string, password: string, name: string): Promise<User | null> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: name
      }
    }
  })

  if (error) throw error

  const { user } = data
  if (!user) throw new Error('User creation failed')

  // The trigger will automatically create the user in public.users
  // But we'll try to insert as a fallback in case the trigger hasn't run yet
  const role = email === 'admins@necc.com' ? 'admin' : 'user'
  const balance = role === 'admin' ? 1000 : 0

  // Try to insert, but ignore if it already exists (trigger may have created it)
  await supabase.from('users').insert({
    id: user.id,
    email,
    name,
    balance,
    is_member: false,
    role,
  }).select().single().then(({ error }) => {
    // Ignore error if user already exists (trigger created it)
    if (error && !error.message.includes('duplicate')) {
      console.error('Error creating user record:', error)
    }
  })

  // Wait a bit for trigger to complete, then fetch the user
  await new Promise(resolve => setTimeout(resolve, 500))
  
  // Try to get the user from public.users
  const createdUser = await getCurrentUser()
  if (createdUser) {
    return createdUser
  }

  // Fallback: return user object even if not in public.users yet
  return {
    id: user.id,
    email,
    name,
    balance,
    isMember: false,
    role,
    createdAt: new Date().toISOString(),
  }
}

export async function logout() {
  const { error } = await supabase.auth.signOut()
  if (error) console.error('Logout error:', error)
}

export async function getUsers(): Promise<User[]> {
  const { data, error } = await supabase.from('users').select('*')
  if (error) {
    console.error('Get users error:', error)
    return []
  }
  return (data || []).map(user => ({
    id: user.id,
    email: user.email,
    name: user.name,
    balance: parseFloat(user.balance) || 0,
    isMember: user.is_member || false,
    role: user.role || 'user',
    createdAt: user.created_at,
  }))
}

export async function updateUserBalance(userId: string, newBalance: number) {
  // Arredondar para 2 casas decimais antes de salvar
  const roundedBalance = Math.round(newBalance * 100) / 100
  
  const { error } = await supabase
    .from('users')
    .update({ balance: roundedBalance })
    .eq('id', userId)

  if (error) {
    console.error('Update balance error:', error)
    throw error
  }
}

export async function updateUserMember(userId: string, isMember: boolean) {
  const { error } = await supabase
    .from('users')
    .update({ is_member: isMember })
    .eq('id', userId)

  if (error) {
    console.error('Update member status error:', error)
    throw error
  }
}

export async function updateUser(userId: string, updates: {
  name?: string
  email?: string
  balance?: number
  isMember?: boolean
  role?: 'admin' | 'user'
}) {
  const updateData: any = {}
  
  if (updates.name !== undefined) updateData.name = updates.name
  if (updates.email !== undefined) updateData.email = updates.email
  if (updates.balance !== undefined) updateData.balance = updates.balance
  if (updates.isMember !== undefined) updateData.is_member = updates.isMember
  if (updates.role !== undefined) updateData.role = updates.role

  const { error } = await supabase
    .from('users')
    .update(updateData)
    .eq('id', userId)

  if (error) {
    console.error('Update user error:', error)
    throw error
  }
}

export async function getOrders(): Promise<Order[]> {
  try {
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          id,
          product_id,
          quantity,
          price_per_unit,
          subtotal,
          products (
            name
          )
        )
      `)
      .order('timestamp', { ascending: false })

    if (ordersError) {
      console.error('Error fetching orders:', ordersError)
      return []
    }

    // Get user names
    const userIds = [...new Set((orders || []).map((o: any) => o.user_id))]
    const { data: users } = await supabase
      .from('users')
      .select('id, name')
      .in('id', userIds)

    const userMap = new Map((users || []).map((u: any) => [u.id, u.name]))

    return (orders || []).map((order: any) => ({
      id: order.id,
      userId: order.user_id,
      userName: userMap.get(order.user_id) || 'Unknown',
      total: parseFloat(order.total) || 0,
      paymentMethod: order.payment_method,
      items: (order.order_items || []).map((item: any) => ({
        productId: item.product_id,
        productName: item.products?.name || 'Unknown',
        quantity: item.quantity,
        pricePerUnit: parseFloat(item.price_per_unit) || 0,
        subtotal: parseFloat(item.subtotal) || 0,
      })),
      timestamp: order.timestamp,
    }))
  } catch (error) {
    console.error('Error in getOrders:', error)
    return []
  }
}

export async function addOrder(
  userId: string,
  items: Array<{ productId: string; quantity: number }>,
  paymentMethod: 'balance' | 'cash'
) {
  try {
    // Get user data to check member status and balance
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('balance, is_member')
      .eq('id', userId)
      .single()

    if (userError || !userData) {
      console.error('Error fetching user data:', userError)
      throw new Error('Erro ao obter dados do utilizador')
    }

    const isMember = userData.is_member || false
    const userBalance = parseFloat(userData.balance) || 0

    // Get products to determine prices based on member status
    const productIds = items.map(item => item.productId)
    const { data: productsData, error: productsError } = await supabase
      .from('products')
      .select('id, purchase_price, selling_price_member, selling_price_non_member, stock')
      .in('id', productIds)

    if (productsError || !productsData) {
      console.error('Error fetching products:', productsError)
      throw new Error('Erro ao obter produtos')
    }

    // Create a map for quick product lookup
    const productMap = new Map(productsData.map(p => [p.id, p]))

    // Calculate order items with correct prices and validate stock
    const orderItemsWithPrices = []
    let total = 0

    for (const item of items) {
      const product = productMap.get(item.productId)
      if (!product) {
        throw new Error(`Produto não encontrado: ${item.productId}`)
      }

      // Check stock
      if (item.quantity > (product.stock || 0)) {
        throw new Error(`Stock insuficiente para o produto. Disponível: ${product.stock || 0}`)
      }

      // Determine price based on member status
      const pricePerUnit = isMember 
        ? parseFloat(product.selling_price_member) 
        : parseFloat(product.selling_price_non_member)
      
      // Arredondar para 2 casas decimais para evitar problemas de precisão
      const subtotal = Math.round((pricePerUnit * item.quantity) * 100) / 100
      total = Math.round((total + subtotal) * 100) / 100

      orderItemsWithPrices.push({
        productId: item.productId,
        quantity: item.quantity,
        pricePerUnit: Math.round(pricePerUnit * 100) / 100,
        subtotal: Math.round(subtotal * 100) / 100,
      })
    }

    // Arredondar total final para garantir precisão
    total = Math.round(total * 100) / 100

    // If payment is by balance, verify user has enough balance
    if (paymentMethod === 'balance') {
      if (userBalance < total) {
        throw new Error(`Saldo insuficiente! Total: N${total.toFixed(2)}, Saldo disponível: N${userBalance.toFixed(2)}`)
      }
    }

    // Create order with payment_processed = false
    // Stock will only be deducted after payment is confirmed
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: userId,
        total,
        payment_method: paymentMethod,
        payment_processed: false,
      })
      .select()
      .single()

    if (orderError) {
      console.error('Error creating order:', orderError)
      throw new Error('Erro ao criar encomenda')
    }

    // Create order items
    // Note: inventory_movements will be created automatically by trigger
    // ONLY after payment_processed is set to true (security measure)
    for (const item of orderItemsWithPrices) {
      const { error: itemError } = await supabase
        .from('order_items')
        .insert({
          order_id: order.id,
          product_id: item.productId,
          quantity: item.quantity,
          price_per_unit: item.pricePerUnit,
          subtotal: item.subtotal,
        })

      if (itemError) {
        console.error('Error creating order item:', itemError)
        throw new Error('Erro ao criar item da encomenda')
      }
    }

    // Process payment BEFORE marking as processed
    // This ensures payment is completed before stock is deducted
    if (paymentMethod === 'balance') {
      const newBalance = Math.round((userBalance - total) * 100) / 100
      await updateUserBalance(userId, newBalance)
    }

    // NOTA: Para pagamento em dinheiro, o available_cash é atualizado automaticamente
    // pelo trigger na base de dados quando payment_processed é atualizado para true
    // Não precisamos atualizar manualmente aqui

    // Processar pagamento no servidor usando função stored procedure
    // Esta função atualiza payment_processed E cria inventory_movements numa transação atómica
    // O trigger também atualiza available_cash automaticamente se payment_method = 'cash'
    // É mais seguro porque tudo acontece no servidor, não no cliente
    const { error: processError } = await supabase.rpc('process_order_payment', {
      p_order_id: order.id,
      p_user_id: userId
    })

    if (processError) {
      console.error('Error processing payment:', processError)
      throw new Error(`Erro ao processar pagamento: ${processError.message || 'Erro desconhecido'}`)
    }

    console.log('✅ Pagamento processado e inventory movements criados com sucesso')

    return order
  } catch (error: any) {
    console.error('Error in addOrder:', error)
    throw error
  }
}

export async function getProducts(): Promise<Product[]> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching products:', error)
      return []
    }

    return (data || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      image: p.image || '',
      stock: p.stock || 0,
      purchasePrice: parseFloat(p.purchase_price) || 0,
      sellingPriceMember: parseFloat(p.selling_price_member) || 0,
      sellingPriceNonMember: parseFloat(p.selling_price_non_member) || 0,
    }))
  } catch (error) {
    console.error('Error in getProducts:', error)
    return []
  }
}

export async function updateProduct(productId: string, updates: Partial<Product>) {
  try {
    const updateData: any = {}
    if (updates.name !== undefined) updateData.name = updates.name
    if (updates.image !== undefined) updateData.image = updates.image
    if (updates.purchasePrice !== undefined) updateData.purchase_price = updates.purchasePrice
    if (updates.sellingPriceMember !== undefined) updateData.selling_price_member = updates.sellingPriceMember
    if (updates.sellingPriceNonMember !== undefined) updateData.selling_price_non_member = updates.sellingPriceNonMember

    const { error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', productId)

    if (error) {
      console.error('Error updating product:', error)
      throw error
    }
  } catch (error) {
    console.error('Error in updateProduct:', error)
    throw error
  }
}

export async function addProductStock(productId: string, quantity: number, type: 'add_stock' | 'correction' = 'add_stock') {
  try {
    // Create inventory movement - trigger will update stock automatically
    const { error } = await supabase
      .from('inventory_movements')
      .insert({
        product_id: productId,
        type,
        quantity,
      })

    if (error) {
      console.error('Error adding stock:', error)
      throw error
    }
  } catch (error) {
    console.error('Error in addProductStock:', error)
    throw error
  }
}

export async function addProduct(product: Omit<Product, 'id'>) {
  try {
    const { data, error } = await supabase
      .from('products')
      .insert({
        name: product.name,
        image: product.image,
        stock: product.stock,
        purchase_price: product.purchasePrice,
        selling_price_member: product.sellingPriceMember,
        selling_price_non_member: product.sellingPriceNonMember,
      })
      .select()
      .single()

    if (error) {
      console.error('Error adding product:', error)
      throw error
    }

    return {
      id: data.id,
      name: data.name,
      image: data.image || '',
      stock: data.stock || 0,
      purchasePrice: parseFloat(data.purchase_price) || 0,
      sellingPriceMember: parseFloat(data.selling_price_member) || 0,
      sellingPriceNonMember: parseFloat(data.selling_price_non_member) || 0,
    }
  } catch (error) {
    console.error('Error in addProduct:', error)
    throw error
  }
}

export async function deleteProduct(productId: string) {
  try {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId)

    if (error) {
      console.error('Error deleting product:', error)
      throw error
    }
  } catch (error) {
    console.error('Error in deleteProduct:', error)
    throw error
  }
}

export async function getDeposits(userId?: string): Promise<Deposit[]> {
  try {
    let query = supabase
      .from('deposits')
      .select('*')
      .order('timestamp', { ascending: false })

    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching deposits:', error)
      return []
    }

    return (data || []).map((d: any) => ({
      id: d.id,
      userId: d.user_id,
      amount: parseFloat(d.amount) || 0,
      method: d.method,
      timestamp: d.timestamp,
    }))
  } catch (error) {
    console.error('Error in getDeposits:', error)
    return []
  }
}

export async function addDeposit(userId: string, amount: number, method: 'cash' | 'mbway' | 'adjustment') {
  try {
    const { error: depositError } = await supabase
      .from('deposits')
      .insert({
        user_id: userId,
        amount,
        method,
      })

    if (depositError) {
      console.error('Error creating deposit:', depositError)
      throw depositError
    }

    // Update user balance
    const { data: userData } = await supabase
      .from('users')
      .select('balance')
      .eq('id', userId)
      .single()

    if (userData) {
      const newBalance = Math.round((parseFloat(userData.balance) + amount) * 100) / 100
      await updateUserBalance(userId, newBalance)
    }

    // Update available cash if it's a real deposit (cash or mbway), not an adjustment
    if (method !== 'adjustment') {
      const currentAvailableCash = await getAvailableCash()
      const newAvailableCash = Math.round((currentAvailableCash + amount) * 100) / 100
      await updateAvailableCash(newAvailableCash)
    }
  } catch (error) {
    console.error('Error in addDeposit:', error)
    throw error
  }
}

export async function getTotalDeposits(): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('deposits')
      .select('amount')

    if (error) {
      console.error('Error fetching total deposits:', error)
      return 0
    }

    return (data || []).reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0)
  } catch (error) {
    console.error('Error in getTotalDeposits:', error)
    return 0
  }
}

export async function deleteOrder(orderId: string): Promise<void> {
  try {
    // Get order details first
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('user_id, total, payment_method, order_items(id, product_id, quantity)')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      console.error('Error fetching order:', orderError)
      throw new Error('Erro ao obter dados da encomenda')
    }

    // If payment was by balance, restore user balance
    if (order.payment_method === 'balance') {
      const { data: userData } = await supabase
        .from('users')
        .select('balance')
        .eq('id', order.user_id)
        .single()

      if (userData) {
        const currentBalance = parseFloat(userData.balance) || 0
        const newBalance = Math.round((currentBalance + parseFloat(order.total)) * 100) / 100
        await updateUserBalance(order.user_id, newBalance)
      }
    }

    // NOTA: Para pagamento em dinheiro, o available_cash é revertido automaticamente
    // pelo trigger na base de dados quando a ordem é deletada
    // NÃO atualizar manualmente aqui - o trigger cuida disso automaticamente
    // Se tentarmos atualizar manualmente, será removido duas vezes (uma vez manualmente e uma vez pelo trigger)
    // Isso é especialmente problemático para admins que têm permissões RLS para atualizar available_cash

    // Get order items with their IDs first
    const { data: orderItems, error: itemsFetchError } = await supabase
      .from('order_items')
      .select('id, product_id, quantity')
      .eq('order_id', orderId)

    if (itemsFetchError) {
      console.error('Error fetching order items:', itemsFetchError)
      throw new Error('Erro ao obter items da encomenda')
    }

    // Restore stock for each product in the order
    for (const item of orderItems || []) {
      // Add stock back using inventory movement
      await addProductStock(item.product_id, item.quantity, 'correction')
    }

    // Delete inventory movements related to these order items first
    if (orderItems && orderItems.length > 0) {
      const orderItemIds = orderItems.map(item => item.id)
      const { error: invMovementsError } = await supabase
        .from('inventory_movements')
        .delete()
        .in('order_item_id', orderItemIds)

      if (invMovementsError) {
        console.error('Error deleting inventory movements:', invMovementsError)
        throw new Error(`Erro ao apagar movimentos de inventário: ${invMovementsError.message}`)
      }
    }

    // Now delete order items
    const { error: itemsError, data: deletedItems } = await supabase
      .from('order_items')
      .delete()
      .eq('order_id', orderId)
      .select()

    if (itemsError) {
      console.error('Error deleting order items:', itemsError)
      throw new Error(`Erro ao apagar items da encomenda: ${itemsError.message}`)
    }

    // Delete the order
    const { error: deleteError, data: deletedOrder } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId)
      .select()

    if (deleteError) {
      console.error('Error deleting order:', deleteError)
      throw new Error(`Erro ao apagar encomenda: ${deleteError.message}`)
    }

    if (!deletedOrder || deletedOrder.length === 0) {
      throw new Error('Encomenda não encontrada ou já foi apagada')
    }
  } catch (error: any) {
    console.error('Error in deleteOrder:', error)
    throw error
  }
}

export async function deleteDeposit(depositId: string): Promise<void> {
  try {
    // Get deposit details first
    const { data: deposit, error: depositError } = await supabase
      .from('deposits')
      .select('user_id, amount, method')
      .eq('id', depositId)
      .single()

    if (depositError || !deposit) {
      console.error('Error fetching deposit:', depositError)
      throw new Error('Erro ao obter dados do depósito')
    }

    const amount = parseFloat(deposit.amount) || 0

    // Restore user balance (subtract the deposit amount)
    const { data: userData } = await supabase
      .from('users')
      .select('balance')
      .eq('id', deposit.user_id)
      .single()

    if (userData) {
      const currentBalance = parseFloat(userData.balance) || 0
      const newBalance = Math.round((currentBalance - amount) * 100) / 100
      
      // Check if balance would go negative
      if (newBalance < 0) {
        throw new Error('Não é possível apagar este depósito. O saldo do utilizador ficaria negativo.')
      }
      
      await updateUserBalance(deposit.user_id, newBalance)
    }

    // If it was a real deposit (cash or mbway), subtract from available cash
    if (deposit.method !== 'adjustment') {
      const currentAvailableCash = await getAvailableCash()
      const newAvailableCash = Math.round((currentAvailableCash - amount) * 100) / 100
      
      // Check if available cash would go negative
      if (newAvailableCash < 0) {
        throw new Error('Não é possível apagar este depósito. O valor disponível ficaria negativo.')
      }
      
      await updateAvailableCash(newAvailableCash)
    }

    // Delete the deposit
    const { error: deleteError, data: deletedDeposit } = await supabase
      .from('deposits')
      .delete()
      .eq('id', depositId)
      .select()

    if (deleteError) {
      console.error('Error deleting deposit:', deleteError)
      throw new Error(`Erro ao apagar depósito: ${deleteError.message}`)
    }

    if (!deletedDeposit || deletedDeposit.length === 0) {
      throw new Error('Depósito não encontrado ou já foi apagado')
    }
  } catch (error: any) {
    console.error('Error in deleteDeposit:', error)
    throw error
  }
}

// Legacy functions for backward compatibility (deprecated - use getOrders instead)
export async function getTransactions(): Promise<Order[]> {
  return getOrders()
}

export async function addTransaction(transaction: {
  userId: string
  userName: string
  items: Array<{ name: string; price: number; quantity: number }>
  total: number
  isForSomeoneElse: boolean
  isNeccMember: boolean
}) {
  // Get product IDs from names
  const products = await getProducts()
  const productMap = new Map(products.map(p => [p.name, p]))

  const orderItems = transaction.items.map(item => {
    const product = productMap.get(item.name)
    if (!product) {
      throw new Error(`Product not found: ${item.name}`)
    }
    return {
      productId: product.id,
      quantity: item.quantity,
    }
  })

  const paymentMethod = transaction.isForSomeoneElse ? 'cash' : 'balance'
  return addOrder(transaction.userId, orderItems, paymentMethod)
}

export async function getAvailableCash(): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('available_cash')
      .select('amount')
      .eq('id', '00000000-0000-0000-0000-000000000000')
      .single()

    if (error) {
      console.error('Error fetching available cash:', error)
      return 0
    }

    return parseFloat(data?.amount || 0) || 0
  } catch (error) {
    console.error('Error in getAvailableCash:', error)
    return 0
  }
}

export async function updateAvailableCash(amount: number): Promise<void> {
  // Arredondar para 2 casas decimais antes de salvar
  const roundedAmount = Math.round(amount * 100) / 100
  try {
    const { error } = await supabase
      .from('available_cash')
      .update({ amount: roundedAmount })
      .eq('id', '00000000-0000-0000-0000-000000000000')

    if (error) {
      console.error('Error updating available cash:', error)
      throw error
    }
  } catch (error) {
    console.error('Error in updateAvailableCash:', error)
    throw error
  }
}
