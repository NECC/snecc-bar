'use client'

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LogOut, Users, ShoppingCart, Package, Calendar, TrendingUp, DollarSign, BarChart3, HelpCircle, X, Trash2, Home, Wallet, AlertTriangle } from "lucide-react"
import { getCurrentUser, getUsers, getOrders, getProducts, updateUserBalance, addProductStock, logout, getTotalDeposits, updateProduct, addProduct, deleteProduct, restoreProduct, getInactiveProducts, updateUserMember, addDeposit, getDeposits, updateUser, isAdmin, getAvailableCash, updateAvailableCash, deleteOrder, deleteDeposit, getAvailableCashLogs, getTheftRecords, deleteTheftRecord, type User as UserType, type Order, type Product as ProductType, type Deposit, type AvailableCashLog, type TheftRecord } from "@/lib/auth"
import { supabase } from "@/app/config/supabaseClient"
import { AlertProvider, useAlert } from "@/components/ui/alert-dialog"

type User = {
  id: string
  name: string
  email: string
  balance: number
  isMember: boolean
  role?: string
  createdAt?: string
}

type Product = {
  id: string
  name: string
  purchasePrice: number
  sellingPriceMember: number
  sellingPriceNonMember: number
  stock: number
  image?: string
  createdAt?: string
}

function AdminPageContent() {
  const { showAlert, showConfirm } = useAlert()
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [inactiveProducts, setInactiveProducts] = useState<Product[]>([])
  const [showInactiveProducts, setShowInactiveProducts] = useState<boolean>(false)
  const [deposits, setDeposits] = useState<Deposit[]>([])
  const [theftRecords, setTheftRecords] = useState<TheftRecord[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>("")
  const [balanceAmount, setBalanceAmount] = useState<string>("")
  const [depositMethod, setDepositMethod] = useState<'cash' | 'mbway' | 'adjustment'>('cash')
  const [selectedProductId, setSelectedProductId] = useState<string>("")
  const [stockAmount, setStockAmount] = useState<string>("")
  const [initialCupValue, setInitialCupValue] = useState<string>("")
  const [totalDeposits, setTotalDeposits] = useState<number>(0)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [editingProductOriginalStock, setEditingProductOriginalStock] = useState<number>(0)
  const [markAsStolen, setMarkAsStolen] = useState<boolean>(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [editingUserOriginalBalance, setEditingUserOriginalBalance] = useState<number>(0)
  const [selectedUserForDetails, setSelectedUserForDetails] = useState<string | null>(null)
  const [transactionFilter, setTransactionFilter] = useState<'all' | 'orders' | 'deposits' | 'cash_adjustments' | 'thefts'>('all')
  const [transactionUserFilter, setTransactionUserFilter] = useState<string>('all')
  const [transactionUserSearchQuery, setTransactionUserSearchQuery] = useState<string>("")
  const [showTransactionUserSuggestions, setShowTransactionUserSuggestions] = useState<boolean>(false)
  const transactionSearchRef = useRef<HTMLDivElement>(null)
  const [transactionProductFilter, setTransactionProductFilter] = useState<string>('all')
  const [transactionProductSearchQuery, setTransactionProductSearchQuery] = useState<string>("")
  const [showTransactionProductSuggestions, setShowTransactionProductSuggestions] = useState<boolean>(false)
  const transactionProductSearchRef = useRef<HTMLDivElement>(null)
  const [newProduct, setNewProduct] = useState<{ 
    name: string
    purchasePrice: string
    sellingPriceMember: string
    sellingPriceNonMember: string
    stock: string
    image: string
  }>({ 
    name: "", 
    purchasePrice: "", 
    sellingPriceMember: "", 
    sellingPriceNonMember: "", 
    stock: "", 
    image: "" 
  })
  const [isAddingProduct, setIsAddingProduct] = useState(false)
  const [userSearchQuery, setUserSearchQuery] = useState<string>("")
  const [balanceUserSearchQuery, setBalanceUserSearchQuery] = useState<string>("")
  const [showBalanceUserSuggestions, setShowBalanceUserSuggestions] = useState<boolean>(false)
  const [availableCash, setAvailableCash] = useState<number>(0)
  const [editingAvailableCash, setEditingAvailableCash] = useState<boolean>(false)
  const [availableCashInput, setAvailableCashInput] = useState<string>("")
  const [availableCashReason, setAvailableCashReason] = useState<string>("")
  const [availableCashLogs, setAvailableCashLogs] = useState<AvailableCashLog[]>([])
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false)
  const balanceSearchRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  
  // Pagination states for users
  const [usersItemsPerPage, setUsersItemsPerPage] = useState<number>(10)
  const [usersCurrentPage, setUsersCurrentPage] = useState<number>(1)
  
  // Pagination states for transactions
  const [transactionsItemsPerPage, setTransactionsItemsPerPage] = useState<number>(10)
  const [transactionsCurrentPage, setTransactionsCurrentPage] = useState<number>(1)

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (balanceSearchRef.current && !balanceSearchRef.current.contains(event.target as Node)) {
        setShowBalanceUserSuggestions(false)
      }
      if (transactionSearchRef.current && !transactionSearchRef.current.contains(event.target as Node)) {
        setShowTransactionUserSuggestions(false)
      }
      if (transactionProductSearchRef.current && !transactionProductSearchRef.current.contains(event.target as Node)) {
        setShowTransactionProductSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  useEffect(() => {
    const checkUser = async () => {
      const user = await getCurrentUser()
      if (!user || !isAdmin(user)) {
        router.push("/login")
        return
      }
      setCurrentUser({
        id: user.id,
        name: user.name,
        email: user.email,
        balance: user.balance,
        isMember: user.isMember,
        role: user.role,
        createdAt: user.createdAt,
      })
      loadData()
    }
    checkUser()
  }, [router])

  const loadData = async () => {
    const usersData = await getUsers()
    setUsers(usersData.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      balance: u.balance,
      isMember: u.isMember,
      role: u.role,
      createdAt: u.createdAt,
    })))
    const ordersData = await getOrders()
    setOrders(ordersData)
    const productsData = await getProducts()
    setProducts(productsData.map(p => ({
      id: p.id,
      name: p.name,
      purchasePrice: p.purchasePrice,
      sellingPriceMember: p.sellingPriceMember,
      sellingPriceNonMember: p.sellingPriceNonMember,
      stock: p.stock,
      image: p.image,
    })))
    // Load inactive products
    const inactiveProductsData = await getInactiveProducts()
    setInactiveProducts(inactiveProductsData.map(p => ({
      id: p.id,
      name: p.name,
      purchasePrice: p.purchasePrice,
      sellingPriceMember: p.sellingPriceMember,
      sellingPriceNonMember: p.sellingPriceNonMember,
      stock: p.stock,
      image: p.image,
    })))
    const allDeposits = await getDeposits()
    setDeposits(allDeposits)
    const totalDepositsAmount = await getTotalDeposits()
    setTotalDeposits(totalDepositsAmount)
    const availableCashAmount = await getAvailableCash()
    setAvailableCash(availableCashAmount)
    const cashLogs = await getAvailableCashLogs()
    setAvailableCashLogs(cashLogs)
    const thefts = await getTheftRecords()
    setTheftRecords(thefts)
  }

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  const handleAddBalance = async () => {
    if (!selectedUserId || !balanceAmount) return
    const user = users.find((u) => u.id === selectedUserId)
    if (!user) return

    const amount = Number.parseFloat(balanceAmount)
    if (isNaN(amount) || amount === 0) {
      await showAlert({
        message: "Por favor, insira um valor válido (diferente de zero)",
        type: 'warning'
      })
      return
    }

    // Check if removing money would result in negative balance
    if (amount < 0 && user.balance + amount < 0) {
      await showAlert({
        message: `Não é possível remover N${Math.abs(amount).toFixed(2)}. Saldo atual: N${user.balance.toFixed(2)}`,
        type: 'error'
      })
      return
    }

    try {
      await addDeposit(selectedUserId, amount, depositMethod)
      setBalanceAmount("")
      setSelectedUserId("")
      setBalanceUserSearchQuery("")
      setDepositMethod('cash')
      loadData()
    } catch (error) {
      console.error('Error adding deposit:', error)
      await showAlert({
        message: 'Erro ao adicionar depósito',
        type: 'error'
      })
    }
  }

  const handleUpdateStock = async () => {
    if (!selectedProductId || !stockAmount) return
    const quantity = Number.parseInt(stockAmount)
    if (isNaN(quantity) || quantity <= 0) {
      await showAlert({
        message: "Por favor, insira uma quantidade válida",
        type: 'warning'
      })
      return
    }

    try {
      await addProductStock(selectedProductId, quantity, 'add_stock')
      setStockAmount("")
      setSelectedProductId("")
      loadData()
    } catch (error) {
      console.error('Error updating stock:', error)
      await showAlert({
        message: 'Erro ao atualizar stock',
        type: 'error'
      })
    }
  }

  const handleEditProduct = (product: Product) => {
    setEditingProduct({ ...product })
    setEditingProductOriginalStock(product.stock)
    setMarkAsStolen(false) // Reset checkbox when editing
    setIsAddingProduct(false)
  }

  const handleSaveProduct = async () => {
    if (!editingProduct) return
    if (!editingProduct.name || 
        editingProduct.purchasePrice < 0 || 
        editingProduct.sellingPriceMember < 0 || 
        editingProduct.sellingPriceNonMember < 0 ||
        editingProduct.stock < 0) {
      await showAlert({
        message: "Por favor, preencha todos os campos corretamente",
        type: 'warning'
      })
      return
    }

    try {
      // Update product details
      await updateProduct(editingProduct.id, {
        name: editingProduct.name,
        purchasePrice: editingProduct.purchasePrice,
        sellingPriceMember: editingProduct.sellingPriceMember,
        sellingPriceNonMember: editingProduct.sellingPriceNonMember,
        image: editingProduct.image || "",
      })

      // Update stock if it changed
      const stockDifference = editingProduct.stock - editingProductOriginalStock
      if (stockDifference !== 0) {
        // If stock decreased and marked as stolen, use 'theft' type
        // Otherwise use 'correction' for any stock change
        const movementType = stockDifference < 0 && markAsStolen ? 'theft' : 'correction'
        console.log('Updating stock:', { stockDifference, movementType, markAsStolen })
        try {
          // Pass adminId when it's a theft so we can track who marked it as stolen
          const adminId = movementType === 'theft' && currentUser ? currentUser.id : undefined
          await addProductStock(editingProduct.id, stockDifference, movementType, adminId)
        } catch (stockError: any) {
          console.error('Error updating stock:', stockError)
          await showAlert({
            message: `Erro ao atualizar stock: ${stockError?.message || 'Erro desconhecido'}`,
            type: 'error'
          })
          return // Don't continue if stock update fails
        }
      }

      setEditingProduct(null)
      setEditingProductOriginalStock(0)
      setMarkAsStolen(false)
      // Reload data to get updated stock and theft records
      await loadData()
    } catch (error) {
      console.error('Error saving product:', error)
      await showAlert({
        message: 'Erro ao guardar produto',
        type: 'error'
      })
    }
  }

  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.purchasePrice || !newProduct.sellingPriceMember || !newProduct.sellingPriceNonMember || !newProduct.stock) {
      await showAlert({
        message: "Por favor, preencha todos os campos",
        type: 'warning'
      })
      return
    }
    const purchasePrice = Number.parseFloat(newProduct.purchasePrice)
    const sellingPriceMember = Number.parseFloat(newProduct.sellingPriceMember)
    const sellingPriceNonMember = Number.parseFloat(newProduct.sellingPriceNonMember)
    const stock = Number.parseInt(newProduct.stock)
    if (purchasePrice < 0 || sellingPriceMember < 0 || sellingPriceNonMember < 0 || stock < 0) {
      await showAlert({
        message: "Por favor, insira valores válidos",
        type: 'warning'
      })
      return
    }

    try {
      await addProduct({
        name: newProduct.name,
        purchasePrice,
        sellingPriceMember,
        sellingPriceNonMember,
        stock,
        image: newProduct.image || "",
      })
      setNewProduct({ name: "", purchasePrice: "", sellingPriceMember: "", sellingPriceNonMember: "", stock: "", image: "" })
      setIsAddingProduct(false)
      loadData()
    } catch (error) {
      console.error('Error adding product:', error)
      await showAlert({
        message: 'Erro ao adicionar produto',
        type: 'error'
      })
    }
  }

  const handleDeleteProduct = async (productId: string) => {
    const confirmed = await showConfirm({
      title: "Confirmar Remoção",
      message: "Tem certeza que deseja remover este produto? O produto será ocultado mas mantido no histórico de encomendas.",
      type: 'warning',
      confirmText: 'Remover',
      cancelText: 'Cancelar'
    })
    if (!confirmed) return
    
    try {
      await deleteProduct(productId)
      await showAlert({
        message: 'Produto removido com sucesso. Pode restaurá-lo mais tarde se necessário.',
        type: 'success'
      })
      loadData()
    } catch (error: any) {
      console.error('Error deleting product:', error)
      await showAlert({
        message: error?.message || 'Erro ao remover produto',
        type: 'error'
      })
    }
  }

  const handleRestoreProduct = async (productId: string) => {
    const confirmed = await showConfirm({
      title: "Confirmar Restauração",
      message: "Tem certeza que deseja restaurar este produto?",
      type: 'info',
      confirmText: 'Restaurar',
      cancelText: 'Cancelar'
    })
    if (!confirmed) return
    
    try {
      await restoreProduct(productId)
      await showAlert({
        message: 'Produto restaurado com sucesso',
        type: 'success'
      })
      loadData()
    } catch (error: any) {
      console.error('Error restoring product:', error)
      await showAlert({
        message: error?.message || 'Erro ao restaurar produto',
        type: 'error'
      })
    }
  }

  const handleCancelEdit = () => {
    setEditingProduct(null)
    setEditingProductOriginalStock(0)
    setMarkAsStolen(false)
    setIsAddingProduct(false)
    setNewProduct({ name: "", purchasePrice: "", sellingPriceMember: "", sellingPriceNonMember: "", stock: "", image: "" })
  }


  // Função helper para arredondar valores monetários
  const roundMoney = (value: number) => Math.round(value * 100) / 100

  const totalRevenue = roundMoney(orders.reduce((sum, o) => sum + o.total, 0))
  const totalOrders = orders.length
  const revenueFromBalance = roundMoney(orders.filter(o => o.paymentMethod === 'balance').reduce((sum, o) => sum + o.total, 0))
  const revenueFromCash = roundMoney(orders.filter(o => o.paymentMethod === 'cash').reduce((sum, o) => sum + o.total, 0))
  const totalUsers = users.length
  const totalMembers = users.filter(u => u.isMember).length
  const totalProducts = products.length
  const totalStockValue = roundMoney(products.reduce((sum, p) => sum + (p.purchasePrice * p.stock), 0))
  const totalUserBalances = roundMoney(users.reduce((sum, u) => sum + u.balance, 0))
  const totalPurchased = roundMoney(orders.reduce((sum, o) => sum + o.total, 0))
  
  // Riqueza total = depósitos + compras em dinheiro (não conta duas vezes)
  // Se alguém carrega saldo e depois compra com saldo, não conta duas vezes
  const totalWealth = roundMoney(totalDeposits + revenueFromCash)
  
  // Lucro esperado: se todos comprarem como sócios (preço sócio - preço compra) * stock
  const calculateExpectedProfit = () => {
    return roundMoney(products.reduce((total, product) => {
      const profitPerUnit = product.sellingPriceMember - product.purchasePrice
      return total + (profitPerUnit * product.stock)
    }, 0))
  }
  
  // Lucro real: lucro de vendas aos sócios - valor em stock
  // Lucro de vendas aos sócios = receita de vendas aos sócios - custo das vendas aos sócios
  const calculateActualProfit = () => {
    // Calcular receita de vendas aos sócios (apenas vendas pagas com saldo ou dinheiro, mas considerando preço sócio)
    // Na verdade, precisamos calcular o lucro real baseado nas vendas feitas
    // Lucro real = receita total - custo das mercadorias vendidas
    const costOfGoodsSold = roundMoney(orders.reduce((total, order) => {
      return total + order.items.reduce((orderTotal, item) => {
        const product = products.find(p => p.id === item.productId)
        if (product) {
          return orderTotal + (product.purchasePrice * item.quantity)
        }
        return orderTotal
      }, 0)
    }, 0))
    return roundMoney(totalRevenue - costOfGoodsSold)
  }
  
  const expectedProfit = calculateExpectedProfit()
  const actualProfit = calculateActualProfit()
  
  const handleSaveAvailableCash = async () => {
    const amount = Number.parseFloat(availableCashInput)
    if (isNaN(amount) || amount < 0) {
      await showAlert({
        message: "Por favor, insira um valor válido (maior ou igual a zero)",
        type: 'warning'
      })
      return
    }
    
    try {
      const reason = availableCashReason.trim() || 'Ajuste manual pelo administrador'
      const adminId = currentUser?.id
      await updateAvailableCash(amount, reason, adminId)
      setAvailableCash(amount)
      setEditingAvailableCash(false)
      setAvailableCashInput("")
      setAvailableCashReason("")
      // Reload logs after update
      const cashLogs = await getAvailableCashLogs()
      setAvailableCashLogs(cashLogs)
    } catch (error) {
      console.error('Error updating available cash:', error)
      await showAlert({
        message: 'Erro ao atualizar valor disponível',
        type: 'error'
      })
    }
  }
  
  const handleEditAvailableCash = () => {
    setAvailableCashInput(availableCash.toFixed(2))
    setEditingAvailableCash(true)
  }
  
  const handleCancelEditAvailableCash = () => {
    setEditingAvailableCash(false)
    setAvailableCashInput("")
    setAvailableCashReason("")
  }
  
  const handleDeleteTransaction = async (transaction: Transaction) => {
    let transactionType: string
    let confirmMessage: string
    
    if (transaction.type === 'order') {
      transactionType = 'encomenda'
      confirmMessage = `Tem certeza que deseja apagar esta ${transactionType}?\n\n` +
        `Usuário: ${transaction.userName}\n` +
        `Valor: N${Math.abs(transaction.amount).toFixed(2)}\n` +
        `Data: ${new Date(transaction.timestamp).toLocaleString('pt-PT')}\n\n` +
        `Esta ação irá reverter todas as alterações (saldo, stock, etc.) e não pode ser desfeita.`
    } else if (transaction.type === 'deposit') {
      transactionType = 'depósito'
      confirmMessage = `Tem certeza que deseja apagar este ${transactionType}?\n\n` +
        `Usuário: ${transaction.userName}\n` +
        `Valor: N${Math.abs(transaction.amount).toFixed(2)}\n` +
        `Data: ${new Date(transaction.timestamp).toLocaleString('pt-PT')}\n\n` +
        `Esta ação irá reverter todas as alterações (saldo, stock, etc.) e não pode ser desfeita.`
    } else if (transaction.type === 'theft') {
      transactionType = 'roubo/perda'
      confirmMessage = `Tem certeza que deseja apagar este registro de ${transactionType}?\n\n` +
        `Produto: ${transaction.details}\n` +
        `Valor: N${Math.abs(transaction.amount).toFixed(2)}\n` +
        `Data: ${new Date(transaction.timestamp).toLocaleString('pt-PT')}\n\n` +
        `Esta ação irá restaurar o stock e não pode ser desfeita.`
    } else {
      // Cash adjustments cannot be deleted
      return
    }
    
    const confirmed = await showConfirm({
      title: `Apagar ${transactionType.charAt(0).toUpperCase() + transactionType.slice(1)}`,
      message: confirmMessage,
      type: 'warning',
      confirmText: 'Apagar',
      cancelText: 'Cancelar'
    })
    
    if (!confirmed) {
      return
    }

    try {
      if (transaction.type === 'order') {
        await deleteOrder(transaction.id)
      } else if (transaction.type === 'deposit') {
        await deleteDeposit(transaction.id)
      } else if (transaction.type === 'theft') {
        await deleteTheftRecord(transaction.id)
      }
      loadData()
      await showAlert({
        message: `${transactionType.charAt(0).toUpperCase() + transactionType.slice(1)} apagado com sucesso!`,
        type: 'success'
      })
    } catch (error: any) {
      console.error('Error deleting transaction:', error)
      await showAlert({
        message: error?.message || `Erro ao apagar ${transactionType}`,
        type: 'error'
      })
    }
  }
  
  const getUserStats = (userId: string) => {
    const userOrders = orders.filter(o => o.userId === userId)
    const userDeposits = deposits.filter(d => d.userId === userId)
    return {
      totalSpent: roundMoney(userOrders.reduce((sum, o) => sum + o.total, 0)),
      totalDeposited: roundMoney(userDeposits.reduce((sum, d) => sum + d.amount, 0)),
      orderCount: userOrders.length,
      depositCount: userDeposits.length,
    }
  }

  // Search users by name or email (este comentario foi feito pelo davide e nao pelo chatgpt)
  const filteredUsers = users.filter((user) => {
    const query = userSearchQuery.toLowerCase()
    return (
      user.name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query)
    )
  })
  
  // Pagination for users
  const usersTotalPages = Math.ceil(filteredUsers.length / usersItemsPerPage)
  const usersStartIndex = (usersCurrentPage - 1) * usersItemsPerPage
  const usersEndIndex = usersStartIndex + usersItemsPerPage
  const paginatedUsers = filteredUsers.slice(usersStartIndex, usersEndIndex)
  
  // Reset to page 1 when items per page changes or search changes
  useEffect(() => {
    setUsersCurrentPage(1)
  }, [usersItemsPerPage, userSearchQuery])

  const handleToggleNeccMember = async (userId: string, currentStatus: boolean) => {
    try {
      await updateUserMember(userId, !currentStatus)
      loadData()
    } catch (error) {
      console.error('Error updating member status:', error)
      await showAlert({
        message: 'Erro ao atualizar status de membro',
        type: 'error'
      })
    }
  }

  const handleEditUser = (user: User) => {
    setEditingUser({ ...user })
    setEditingUserOriginalBalance(user.balance)
    setSelectedUserForDetails(null) // Close details when opening edit
  }

  const handleSaveUser = async () => {
    if (!editingUser) return
    if (!editingUser.name || !editingUser.email) {
      await showAlert({
        message: "Por favor, preencha nome e email",
        type: 'warning'
      })
      return
    }

    try {
      // Check if balance changed
      const balanceDifference = editingUser.balance - editingUserOriginalBalance
      
      // If balance changed, create a deposit/adjustment record and update balance
      if (balanceDifference !== 0) {
        // Use addDeposit which handles the balance update correctly (adds the amount, so negative values subtract)
        await addDeposit(editingUser.id, balanceDifference, 'adjustment')
        // Note: addDeposit already updates the balance, so we don't need to update it again
      }

      // Update user with all other values (balance already updated by addDeposit if changed)
      await updateUser(editingUser.id, {
        name: editingUser.name,
        email: editingUser.email,
        // Only update balance if it didn't change (to avoid overwriting)
        balance: balanceDifference !== 0 ? undefined : editingUser.balance,
        isMember: editingUser.isMember,
        role: editingUser.role as 'admin' | 'user' | undefined,
      })
      
      setEditingUser(null)
      setEditingUserOriginalBalance(0)
      loadData()
    } catch (error) {
      console.error('Error saving user:', error)
      await showAlert({
        message: 'Erro ao guardar usuário',
        type: 'error'
      })
    }
  }

  const handleCancelEditUser = () => {
    setEditingUser(null)
    setEditingUserOriginalBalance(0)
  }

  // Combine orders, deposits, cash adjustments, and thefts for transactions view
  type Transaction = {
    id: string
    type: 'order' | 'deposit' | 'cash_adjustment' | 'theft'
    userId?: string
    userName: string
    amount: number
    previousValue: number
    newValue: number
    timestamp: string
    details: string
    paymentMethod?: string
  }

  const allTransactions: Transaction[] = [
    ...orders.map(order => {
      const user = users.find(u => u.id === order.userId)
      const currentBalance = user?.balance || 0
      // For orders paid with balance: previous = current + total, new = current
      // For orders paid with cash: previous = current, new = current (no balance change)
      const previousBalance = order.paymentMethod === 'balance' 
        ? Math.round((currentBalance + order.total) * 100) / 100
        : currentBalance
      return {
        id: order.id,
        type: 'order' as const,
        userId: order.userId,
        userName: order.userName || user?.name || 'Unknown',
        amount: -order.total, // Negative for expenses
        previousValue: previousBalance,
        newValue: currentBalance,
        timestamp: order.timestamp,
        details: order.items.map(item => `${item.productName} x${item.quantity}`).join(', '),
        paymentMethod: order.paymentMethod,
      }
    }),
    ...deposits.map(deposit => {
      const user = users.find(u => u.id === deposit.userId)
      const currentBalance = user?.balance || 0
      // For deposits: previous = current - amount, new = current
      const previousBalance = Math.round((currentBalance - deposit.amount) * 100) / 100
      return {
        id: deposit.id,
        type: 'deposit' as const,
        userId: deposit.userId,
        userName: user?.name || 'Unknown',
        amount: deposit.amount, // Positive for deposits
        previousValue: previousBalance,
        newValue: currentBalance,
        timestamp: deposit.timestamp,
        details: deposit.method === 'cash' ? 'Dinheiro' : deposit.method === 'mbway' ? 'MB Way' : 'Ajuste',
      }
    }),
    ...availableCashLogs.map(log => ({
      id: log.id,
      type: 'cash_adjustment' as const,
      userId: undefined, // Cash adjustments don't have a user
      userName: log.adminName || 'Sistema',
      amount: log.difference, // Can be positive or negative
      previousValue: log.previousAmount,
      newValue: log.newAmount,
      timestamp: log.timestamp,
      details: log.reason || 'Ajuste manual',
    })),
    ...theftRecords.map(theft => {
      const product = products.find(p => p.id === theft.productId)
      const productValue = product ? product.purchasePrice * theft.quantity : 0
      // For thefts: previous stock = current stock + stolen quantity, new stock = current stock
      const previousStockValue = product ? (product.stock + theft.quantity) * product.purchasePrice : 0
      const newStockValue = product ? product.stock * product.purchasePrice : 0
      return {
        id: theft.id,
        type: 'theft' as const,
        userId: undefined, // Thefts don't have a user
        userName: theft.adminName || 'Sistema',
        amount: -productValue, // Negative value (loss)
        previousValue: previousStockValue,
        newValue: newStockValue,
        timestamp: theft.timestamp,
        details: `${theft.productName} x${theft.quantity} (Roubado/Perdido)`,
      }
    }),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  // Filter transactions
  const filteredTransactions = allTransactions.filter(transaction => {
    if (transactionFilter === 'orders' && transaction.type !== 'order') return false
    if (transactionFilter === 'deposits' && transaction.type !== 'deposit') return false
    if (transactionFilter === 'cash_adjustments' && transaction.type !== 'cash_adjustment') return false
    if (transactionFilter === 'thefts' && transaction.type !== 'theft') return false
    if (transactionUserFilter !== 'all') {
      // Cash adjustments and thefts don't have users, so exclude them when filtering by user
      if (transaction.type === 'cash_adjustment' || transaction.type === 'theft') return false
      if (transaction.userId !== transactionUserFilter) return false
    }
    if (transactionProductFilter !== 'all') {
      // Filter by product for orders and thefts
      if (transaction.type === 'order') {
        const order = orders.find(o => o.id === transaction.id)
        if (order) {
          // Check if any item in the order matches the selected product
          const hasProduct = order.items.some(item => item.productId === transactionProductFilter)
          if (!hasProduct) return false
        } else {
          return false
        }
      } else if (transaction.type === 'theft') {
        // For thefts, check if the product matches
        const theft = theftRecords.find(t => t.id === transaction.id)
        if (!theft || theft.productId !== transactionProductFilter) return false
      } else {
        // For deposits and cash adjustments, exclude them when filtering by product
        return false
      }
    }
    return true
  })
  
  // Pagination for transactions
  const transactionsTotalPages = Math.ceil(filteredTransactions.length / transactionsItemsPerPage)
  const transactionsStartIndex = (transactionsCurrentPage - 1) * transactionsItemsPerPage
  const transactionsEndIndex = transactionsStartIndex + transactionsItemsPerPage
  const paginatedTransactions = filteredTransactions.slice(transactionsStartIndex, transactionsEndIndex)
  
  // Reset to page 1 when items per page changes or filters change
  useEffect(() => {
    setTransactionsCurrentPage(1)
  }, [transactionsItemsPerPage, transactionFilter, transactionUserFilter, transactionProductFilter])

  if (!currentUser) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col gap-4 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Admin Backoffice</h1>
              <p className="text-slate-400 text-sm sm:text-base">SNecc-Bar Management System</p>
            </div>
            <div className="hidden sm:block text-right">
              <p className="text-sm text-slate-400">Logged in as</p>
              <p className="text-white font-medium">{currentUser.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
            <div className="text-right flex-1 sm:hidden">
              <p className="text-xs text-slate-400">Logged in as</p>
              <p className="text-white font-medium text-sm truncate">{currentUser.name}</p>
            </div>
            <Button 
              onClick={() => router.push("/")} 
              variant="outline" 
              size="sm"
              className="gap-1.5 sm:gap-2 bg-slate-700 hover:bg-slate-600 text-white border-slate-600 text-xs sm:text-sm flex-shrink-0"
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">Página Principal</span>
              <span className="sm:hidden">Principal</span>
            </Button>
            <Button 
              onClick={handleLogout} 
              variant="outline" 
              size="sm"
              className="gap-1.5 sm:gap-2 bg-transparent border-slate-600 text-white hover:bg-slate-700 text-xs sm:text-sm flex-shrink-0"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-200">Total Users</CardTitle>
              <Users className="w-4 h-4 text-cyan-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{totalUsers}</div>
              <p className="text-xs text-slate-400 mt-1">{totalMembers} membros</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-200">Total Orders</CardTitle>
              <ShoppingCart className="w-4 h-4 text-cyan-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{totalOrders}</div>
              <p className="text-xs text-slate-400 mt-1">N{totalRevenue.toFixed(2)} receita</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-200">Total Revenue</CardTitle>
              <DollarSign className="w-4 h-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">N{totalRevenue.toFixed(2)}</div>
              <p className="text-xs text-slate-400 mt-1">N{revenueFromBalance.toFixed(2)} saldo / N{revenueFromCash.toFixed(2)} dinheiro</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-200">Lucro Real</CardTitle>
              <TrendingUp className="w-4 h-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">N{actualProfit.toFixed(2)}</div>
              <p className="text-xs text-slate-400 mt-1">N{expectedProfit.toFixed(2)} esperado</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="users" className="space-y-4 sm:space-y-6">
          <div className="overflow-x-auto hide-scrollbar">
            <TabsList className="bg-slate-800 border-slate-700 inline-flex w-full sm:grid sm:grid-cols-5 min-w-max sm:min-w-0">
              <TabsTrigger value="users" className="text-xs sm:text-sm whitespace-nowrap flex-shrink-0">Users</TabsTrigger>
              <TabsTrigger value="transactions" className="text-xs sm:text-sm whitespace-nowrap flex-shrink-0">Transactions</TabsTrigger>
              <TabsTrigger value="balance" className="text-xs sm:text-sm whitespace-nowrap flex-shrink-0">Balance</TabsTrigger>
              <TabsTrigger value="stock" className="text-xs sm:text-sm whitespace-nowrap flex-shrink-0">Stock</TabsTrigger>
              <TabsTrigger value="Necc" className="text-xs sm:text-sm whitespace-nowrap flex-shrink-0">Financeiro</TabsTrigger>
            </TabsList>
          </div>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-slate-200">Users</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="Pesquisar por nome ou email..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="bg-slate-700 text-white border-slate-600"
                />
                
                {/* User Details */}
                {selectedUserForDetails && (
                  <Card className="bg-slate-700 border-slate-600">
                    <CardHeader>
                      <CardTitle className="text-slate-200 text-lg">
                        Detalhes do Usuário: {users.find(u => u.id === selectedUserForDetails)?.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {(() => {
                        const user = users.find(u => u.id === selectedUserForDetails)
                        if (!user) return null
                        const stats = getUserStats(user.id)
                        const userOrdersList = orders.filter(o => o.userId === user.id)
                        const userDepositsList = deposits.filter(d => d.userId === user.id)
                        
                        return (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="bg-slate-600 rounded-lg p-3">
                                <p className="text-xs text-slate-400 mb-1">Total Gasto</p>
                                <p className="text-lg font-bold text-white">N{stats.totalSpent.toFixed(2)}</p>
                              </div>
                              <div className="bg-slate-600 rounded-lg p-3">
                                <p className="text-xs text-slate-400 mb-1">Total Depositado</p>
                                <p className="text-lg font-bold text-green-400">N{stats.totalDeposited.toFixed(2)}</p>
                              </div>
                              <div className="bg-slate-600 rounded-lg p-3">
                                <p className="text-xs text-slate-400 mb-1">Número de Encomendas</p>
                                <p className="text-lg font-bold text-white">{stats.orderCount}</p>
                              </div>
                              <div className="bg-slate-600 rounded-lg p-3">
                                <p className="text-xs text-slate-400 mb-1">Número de Depósitos</p>
                                <p className="text-lg font-bold text-white">{stats.depositCount}</p>
                              </div>
                            </div>
                            
                            <div>
                              <h4 className="text-slate-200 font-semibold mb-2">Últimas Encomendas</h4>
                              <div className="space-y-2 max-h-48 overflow-y-auto">
                                {userOrdersList.slice(0, 5).map((order) => (
                                  <div key={order.id} className="bg-slate-800 rounded p-2 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-slate-300">
                                        {new Date(order.timestamp).toLocaleDateString('pt-PT', { 
                                          day: '2-digit', 
                                          month: '2-digit', 
                                          hour: '2-digit', 
                                          minute: '2-digit' 
                                        })}
                                      </span>
                                      <span className="font-bold text-cyan-400">N{order.total.toFixed(2)}</span>
                                    </div>
                                    <div className="text-xs text-slate-400 mt-1">
                                      {order.items.map((item, idx) => (
                                        <span key={idx}>
                                          {item.productName} x{item.quantity}
                                          {idx < order.items.length - 1 ? ', ' : ''}
                                        </span>
                                      ))}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1">
                                      {order.paymentMethod === 'balance' ? 'Saldo' : 'Dinheiro'}
                                    </div>
                                  </div>
                                ))}
                                {userOrdersList.length === 0 && (
                                  <p className="text-slate-400 text-sm text-center py-2">Nenhuma encomenda</p>
                                )}
                              </div>
                            </div>
                            
                            <div>
                              <h4 className="text-slate-200 font-semibold mb-2">Últimos Depósitos</h4>
                              <div className="space-y-2 max-h-48 overflow-y-auto">
                                {userDepositsList.slice(0, 5).map((deposit) => (
                                  <div key={deposit.id} className="bg-slate-800 rounded p-2 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-slate-300">
                                        {new Date(deposit.timestamp).toLocaleDateString('pt-PT', { 
                                          day: '2-digit', 
                                          month: '2-digit', 
                                          hour: '2-digit', 
                                          minute: '2-digit' 
                                        })}
                                      </span>
                                      <span className={`font-bold ${deposit.amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {deposit.amount >= 0 ? '+' : ''}N{deposit.amount.toFixed(2)}
                                      </span>
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1">
                                      {deposit.method === 'cash' ? 'Dinheiro' : deposit.method === 'mbway' ? 'MB Way' : 'Ajuste'}
                                    </div>
                                  </div>
                                ))}
                                {userDepositsList.length === 0 && (
                                  <p className="text-slate-400 text-sm text-center py-2">Nenhum depósito</p>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })()}
                    </CardContent>
                  </Card>
                )}

                {/* Edit User Form */}
                {editingUser && (
                  <Card className="bg-slate-700 border-slate-600">
                    <CardHeader>
                      <CardTitle className="text-slate-200 text-lg">Editar Usuário</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <Input
                          placeholder="Nome"
                          value={editingUser.name}
                          onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                          className="bg-slate-600 text-white border-slate-500"
                        />
                        <Input
                          type="email"
                          placeholder="Email"
                          value={editingUser.email}
                          onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                          className="bg-slate-600 text-white border-slate-500"
                        />
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Saldo"
                          value={editingUser.balance}
                          onChange={(e) => setEditingUser({ ...editingUser, balance: Number.parseFloat(e.target.value) || 0 })}
                          className="bg-slate-600 text-white border-slate-500"
                        />
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="isMember"
                            checked={editingUser.isMember}
                            onChange={(e) => setEditingUser({ ...editingUser, isMember: e.target.checked })}
                            className="w-4 h-4"
                          />
                          <label htmlFor="isMember" className="text-slate-200 text-sm">Membro NECC</label>
                        </div>
                        <select
                          value={editingUser.role || 'user'}
                          onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as 'admin' | 'user' })}
                          className="w-full p-2 bg-slate-600 text-white border border-slate-500 rounded"
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                        <div className="flex gap-2">
                          <Button onClick={handleSaveUser} className="flex-1 bg-cyan-500 hover:bg-cyan-600">
                            Guardar
                          </Button>
                          <Button onClick={handleCancelEditUser} variant="outline" className="flex-1">
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                {/* Pagination Controls for Users */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-slate-300 whitespace-nowrap">Itens por página:</label>
                    <select
                      value={usersItemsPerPage}
                      onChange={(e) => setUsersItemsPerPage(Number.parseInt(e.target.value))}
                      className="px-3 py-1.5 bg-slate-700 text-white border border-slate-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={15}>15</option>
                      <option value={30}>30</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => setUsersCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={usersCurrentPage === 1}
                      variant="outline"
                      size="sm"
                      className="bg-slate-700 hover:bg-slate-600 text-white border-slate-600 disabled:opacity-50"
                    >
                      Anterior
                    </Button>
                    <span className="text-sm text-slate-300 px-3">
                      Página {usersCurrentPage} de {usersTotalPages || 1}
                    </span>
                    <Button
                      onClick={() => setUsersCurrentPage(prev => Math.min(usersTotalPages, prev + 1))}
                      disabled={usersCurrentPage >= usersTotalPages}
                      variant="outline"
                      size="sm"
                      className="bg-slate-700 hover:bg-slate-600 text-white border-slate-600 disabled:opacity-50"
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-slate-200 min-w-[600px]">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="text-left p-2">Name</th>
                        <th className="text-left p-2">Email</th>
                        <th className="text-left p-2">Balance</th>
                        <th className="text-left p-2">Role</th>
                        <th className="text-left p-2">Membro</th>
                        <th className="text-left p-2">Criado em</th>
                        <th className="text-left p-2">Estatísticas</th>
                        <th className="text-left p-2">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedUsers.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-4 text-center text-slate-400">
                            Nenhum usuário encontrado
                          </td>
                        </tr>
                      ) : (
                        paginatedUsers.map((user) => {
                          const stats = getUserStats(user.id)
                          return (
                            <tr key={user.id} className="border-b border-slate-700">
                              <td className="p-2">{user.name}</td>
                              <td className="p-2 text-sm">{user.email}</td>
                              <td className="p-2">N{user.balance.toFixed(2)}</td>
                              <td className="p-2">
                                <span className={`px-2 py-1 rounded text-xs ${
                                  user.role === 'admin' 
                                    ? 'bg-purple-600 text-white' 
                                    : 'bg-slate-600 text-white'
                                }`}>
                                  {user.role || 'user'}
                                </span>
                              </td>
                              <td className="p-2">
                                <span className={`px-2 py-1 rounded text-xs ${
                                  user.isMember
                                    ? 'bg-green-600 text-white'
                                    : 'bg-slate-600 text-white'
                                }`}>
                                  {user.isMember ? 'Sim' : 'Não'}
                                </span>
                              </td>
                              <td className="p-2 text-xs text-slate-400">
                                {user.createdAt ? new Date(user.createdAt).toLocaleDateString('pt-PT') : '-'}
                              </td>
                              <td className="p-2">
                                <div className="text-xs">
                                  <div>Gasto: N{stats.totalSpent.toFixed(2)}</div>
                                  <div>Depositado: N{stats.totalDeposited.toFixed(2)}</div>
                                  <div>{stats.orderCount} encomendas</div>
                                </div>
                              </td>
                              <td className="p-2">
                                <div className="flex gap-2">
                                  <Button
                                    onClick={() => handleEditUser(user)}
                                    variant="outline"
                                    size="sm"
                                    className="bg-cyan-600 hover:bg-cyan-700 text-white text-xs"
                                  >
                                    Editar
                                  </Button>
                                  <Button
                                    onClick={() => {
                                      const newDetailsId = selectedUserForDetails === user.id ? null : user.id
                                      setSelectedUserForDetails(newDetailsId)
                                      if (newDetailsId !== null) {
                                        setEditingUser(null) // Close edit when opening details
                                        setEditingUserOriginalBalance(0)
                                      }
                                    }}
                                    variant="outline"
                                    size="sm"
                                    className="bg-slate-600 hover:bg-slate-500 text-xs"
                                  >
                                    {selectedUserForDetails === user.id ? 'Ocultar' : 'Detalhes'}
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-slate-200">Transações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Filters */}
                <div className="space-y-4">
                  {/* Transaction Type Filter - Buttons */}
                  <div>
                    <label className="block text-sm text-slate-300 mb-2">Tipo de Transação</label>
                    <div className="flex gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setTransactionFilter('all')}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${
                          transactionFilter === 'all'
                            ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600 border border-slate-600'
                        }`}
                      >
                        Todas
                      </button>
                      <button
                        type="button"
                        onClick={() => setTransactionFilter('orders')}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${
                          transactionFilter === 'orders'
                            ? 'bg-red-500 text-white shadow-lg shadow-red-500/20'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600 border border-slate-600'
                        }`}
                      >
                        <ShoppingCart className="w-4 h-4 inline mr-1.5" />
                        Compras
                      </button>
                      <button
                        type="button"
                        onClick={() => setTransactionFilter('deposits')}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${
                          transactionFilter === 'deposits'
                            ? 'bg-green-500 text-white shadow-lg shadow-green-500/20'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600 border border-slate-600'
                        }`}
                      >
                        <TrendingUp className="w-4 h-4 inline mr-1.5" />
                        Depósitos
                      </button>
                      <button
                        type="button"
                        onClick={() => setTransactionFilter('cash_adjustments')}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${
                          transactionFilter === 'cash_adjustments'
                            ? 'bg-yellow-500 text-white shadow-lg shadow-yellow-500/20'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600 border border-slate-600'
                        }`}
                      >
                        <Wallet className="w-4 h-4 inline mr-1.5" />
                        Ajustes de Cash
                      </button>
                      <button
                        type="button"
                        onClick={() => setTransactionFilter('thefts')}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${
                          transactionFilter === 'thefts'
                            ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600 border border-slate-600'
                        }`}
                      >
                        <AlertTriangle className="w-4 h-4 inline mr-1.5" />
                        Roubos
                      </button>
                    </div>
                  </div>

                  {/* User and Product Filters - Side by Side */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* User Filter - Search */}
                    <div className="relative" ref={transactionSearchRef}>
                      <label className="block text-sm text-slate-300 mb-2">Filtrar por Utilizador</label>
                      <Input
                        type="text"
                        placeholder="Pesquisar por nome ou email... (deixe vazio para todos)"
                        value={transactionUserSearchQuery}
                        onChange={(e) => {
                          setTransactionUserSearchQuery(e.target.value)
                          setShowTransactionUserSuggestions(true)
                          if (e.target.value === "") {
                            setTransactionUserFilter("all")
                          }
                        }}
                        onFocus={() => {
                          if (transactionUserSearchQuery) {
                            setShowTransactionUserSuggestions(true)
                          }
                        }}
                        className="bg-slate-700 text-white border-slate-600"
                      />
                      {showTransactionUserSuggestions && transactionUserSearchQuery && (
                        <div className="absolute z-10 w-full mt-1 bg-slate-700 border border-slate-600 rounded-lg shadow-lg max-h-60 overflow-y-auto hide-scrollbar">
                          <button
                            type="button"
                            onClick={() => {
                              setTransactionUserFilter("all")
                              setTransactionUserSearchQuery("")
                              setShowTransactionUserSuggestions(false)
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-slate-600 text-slate-200 text-sm border-b border-slate-600"
                          >
                            <div className="font-medium">Todos os utilizadores</div>
                          </button>
                          {users
                            .filter((user) => {
                              const query = transactionUserSearchQuery.toLowerCase()
                              return (
                                user.name.toLowerCase().includes(query) ||
                                user.email.toLowerCase().includes(query)
                              )
                            })
                            .slice(0, 10)
                            .map((user) => (
                              <button
                                key={user.id}
                                type="button"
                                onClick={() => {
                                  setTransactionUserFilter(user.id)
                                  setTransactionUserSearchQuery(`${user.name} (${user.email})`)
                                  setShowTransactionUserSuggestions(false)
                                }}
                                className="w-full text-left px-4 py-2 hover:bg-slate-600 text-slate-200 text-sm border-b border-slate-600 last:border-b-0"
                              >
                                <div className="font-medium">{user.name}</div>
                                <div className="text-xs text-slate-400">{user.email}</div>
                              </button>
                            ))}
                          {users.filter((user) => {
                            const query = transactionUserSearchQuery.toLowerCase()
                            return (
                              user.name.toLowerCase().includes(query) ||
                              user.email.toLowerCase().includes(query)
                            )
                          }).length === 0 && (
                            <div className="px-4 py-2 text-slate-400 text-sm">
                              Nenhum utilizador encontrado
                            </div>
                          )}
                        </div>
                      )}
                      {transactionUserFilter !== 'all' && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-xs text-slate-400">Filtrado por:</span>
                          <span className="px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded text-xs font-medium">
                            {users.find(u => u.id === transactionUserFilter)?.name || 'Utilizador'}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setTransactionUserFilter('all')
                              setTransactionUserSearchQuery("")
                            }}
                            className="text-xs text-slate-400 hover:text-slate-300 underline"
                          >
                            Limpar
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Product Filter - Search */}
                    <div className="relative" ref={transactionProductSearchRef}>
                      <label className="block text-sm text-slate-300 mb-2">Filtrar por Produto</label>
                      <Input
                        type="text"
                        placeholder="Pesquisar por nome do produto... (deixe vazio para todos)"
                        value={transactionProductSearchQuery}
                        onChange={(e) => {
                          setTransactionProductSearchQuery(e.target.value)
                          setShowTransactionProductSuggestions(true)
                          if (e.target.value === "") {
                            setTransactionProductFilter("all")
                          }
                        }}
                        onFocus={() => {
                          if (transactionProductSearchQuery) {
                            setShowTransactionProductSuggestions(true)
                          }
                        }}
                        className="bg-slate-700 text-white border-slate-600"
                      />
                      {showTransactionProductSuggestions && transactionProductSearchQuery && (
                        <div className="absolute z-10 w-full mt-1 bg-slate-700 border border-slate-600 rounded-lg shadow-lg max-h-60 overflow-y-auto hide-scrollbar">
                          <button
                            type="button"
                            onClick={() => {
                              setTransactionProductFilter("all")
                              setTransactionProductSearchQuery("")
                              setShowTransactionProductSuggestions(false)
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-slate-600 text-slate-200 text-sm border-b border-slate-600"
                          >
                            <div className="font-medium">Todos os produtos</div>
                          </button>
                          {products
                            .filter((product) => {
                              const query = transactionProductSearchQuery.toLowerCase()
                              return product.name.toLowerCase().includes(query)
                            })
                            .slice(0, 10)
                            .map((product) => (
                              <button
                                key={product.id}
                                type="button"
                                onClick={() => {
                                  setTransactionProductFilter(product.id)
                                  setTransactionProductSearchQuery(product.name)
                                  setShowTransactionProductSuggestions(false)
                                }}
                                className="w-full text-left px-4 py-2 hover:bg-slate-600 text-slate-200 text-sm border-b border-slate-600 last:border-b-0"
                              >
                                <div className="font-medium">{product.name}</div>
                                <div className="text-xs text-slate-400">Stock: {product.stock}</div>
                              </button>
                            ))}
                          {products.filter((product) => {
                            const query = transactionProductSearchQuery.toLowerCase()
                            return product.name.toLowerCase().includes(query)
                          }).length === 0 && (
                            <div className="px-4 py-2 text-slate-400 text-sm">
                              Nenhum produto encontrado
                            </div>
                          )}
                        </div>
                      )}
                      {transactionProductFilter !== 'all' && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-xs text-slate-400">Filtrado por:</span>
                          <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs font-medium">
                            {products.find(p => p.id === transactionProductFilter)?.name || 'Produto'}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setTransactionProductFilter('all')
                              setTransactionProductSearchQuery("")
                            }}
                            className="text-xs text-slate-400 hover:text-slate-300 underline"
                          >
                            Limpar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Pagination Controls for Transactions */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-slate-300 whitespace-nowrap">Itens por página:</label>
                    <select
                      value={transactionsItemsPerPage}
                      onChange={(e) => setTransactionsItemsPerPage(Number.parseInt(e.target.value))}
                      className="px-3 py-1.5 bg-slate-700 text-white border border-slate-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={15}>15</option>
                      <option value={30}>30</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => setTransactionsCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={transactionsCurrentPage === 1}
                      variant="outline"
                      size="sm"
                      className="bg-slate-700 hover:bg-slate-600 text-white border-slate-600 disabled:opacity-50"
                    >
                      Anterior
                    </Button>
                    <span className="text-sm text-slate-300 px-3">
                      Página {transactionsCurrentPage} de {transactionsTotalPages || 1}
                    </span>
                    <Button
                      onClick={() => setTransactionsCurrentPage(prev => Math.min(transactionsTotalPages, prev + 1))}
                      disabled={transactionsCurrentPage >= transactionsTotalPages}
                      variant="outline"
                      size="sm"
                      className="bg-slate-700 hover:bg-slate-600 text-white border-slate-600 disabled:opacity-50"
                    >
                      Próxima
                    </Button>
                  </div>
                </div>

                {/* Transactions Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-slate-200 min-w-[800px]">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="text-left p-2">Tipo</th>
                        <th className="text-left p-2">Usuário</th>
                        <th className="text-left p-2">Detalhes</th>
                        <th className="text-left p-2">Valor Anterior</th>
                        <th className="text-left p-2">Novo Valor</th>
                        <th className="text-left p-2">Diferença</th>
                        <th className="text-left p-2">Método</th>
                        <th className="text-left p-2">Data/Hora</th>
                        <th className="text-left p-2">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedTransactions.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="p-4 text-center text-slate-400">
                            Nenhuma transação encontrada
                          </td>
                        </tr>
                      ) : (
                        paginatedTransactions.map((transaction) => (
                          <tr key={`${transaction.type}-${transaction.id}`} className="border-b border-slate-700">
                            <td className="p-2">
                              <span className={`px-2 py-1 rounded text-xs ${
                                transaction.type === 'order' 
                                  ? 'bg-red-600 text-white' 
                                  : transaction.type === 'deposit'
                                  ? 'bg-green-600 text-white'
                                  : transaction.type === 'cash_adjustment'
                                  ? 'bg-yellow-600 text-white'
                                  : 'bg-orange-600 text-white'
                              }`}>
                                {transaction.type === 'order' ? 'Compra' : transaction.type === 'deposit' ? 'Depósito' : transaction.type === 'cash_adjustment' ? 'Cash' : 'Roubo'}
                              </span>
                            </td>
                            <td className="p-2">{transaction.userName}</td>
                            <td className="p-2 text-sm">
                              <div className="text-xs text-slate-400">{transaction.details}</div>
                            </td>
                            <td className="p-2 text-slate-300">
                              {transaction.type === 'cash_adjustment' 
                                ? `N${transaction.previousValue.toFixed(2)}`
                                : `N${transaction.previousValue.toFixed(2)}`
                              }
                            </td>
                            <td className="p-2 font-semibold text-slate-200">
                              {transaction.type === 'cash_adjustment' 
                                ? `N${transaction.newValue.toFixed(2)}`
                                : `N${transaction.newValue.toFixed(2)}`
                              }
                            </td>
                            <td className={`p-2 font-semibold ${
                              transaction.type === 'theft'
                                ? 'text-orange-400'
                                : transaction.type === 'cash_adjustment'
                                ? (transaction.amount >= 0 ? 'text-yellow-400' : 'text-orange-400')
                                : (transaction.amount < 0 ? 'text-red-400' : 'text-green-400')
                            }`}>
                              {transaction.amount < 0 ? '-' : '+'}N{Math.abs(transaction.amount).toFixed(2)}
                            </td>
                            <td className="p-2 text-sm text-slate-400">
                              {transaction.paymentMethod 
                                ? (transaction.paymentMethod === 'balance' ? 'Saldo' : 'Dinheiro')
                                : transaction.type === 'cash_adjustment' ? 'Ajuste' : '-'
                              }
                            </td>
                            <td className="p-2 text-sm text-slate-400">
                              {new Date(transaction.timestamp).toLocaleString('pt-PT', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </td>
                            <td className="p-2">
                              {transaction.type !== 'cash_adjustment' && (
                                <Button
                                  onClick={() => handleDeleteTransaction(transaction)}
                                  variant="outline"
                                  size="sm"
                                  className="bg-red-600 hover:bg-red-700 text-white text-xs"
                                >
                                  <Trash2 className="w-3 h-3 mr-1" />
                                  Apagar
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Summary */}
                {filteredTransactions.length > 0 && (
                  <div className="mt-4 p-4 bg-slate-700 rounded-lg">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Total de Transações</p>
                        <p className="text-lg font-bold text-white">{filteredTransactions.length}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Total de Depósitos</p>
                        <p className="text-lg font-bold text-green-400">
                          N{filteredTransactions.filter(t => t.type === 'deposit').reduce((sum, t) => sum + t.amount, 0).toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Total de Compras</p>
                        <p className="text-lg font-bold text-red-400">
                          N{Math.abs(filteredTransactions.filter(t => t.type === 'order').reduce((sum, t) => sum + t.amount, 0)).toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Total de Ajustes Cash</p>
                        <p className="text-lg font-bold text-yellow-400">
                          N{Math.abs(filteredTransactions.filter(t => t.type === 'cash_adjustment').reduce((sum, t) => sum + t.amount, 0)).toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Total de Roubos</p>
                        <p className="text-lg font-bold text-orange-400">
                          N{Math.abs(filteredTransactions.filter(t => t.type === 'theft').reduce((sum, t) => sum + t.amount, 0)).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Balance Management Tab */}
          <TabsContent value="balance">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-slate-200">Manage Balance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative" ref={balanceSearchRef}>
                  <label className="block text-sm text-slate-300 mb-2">Pesquisar Utilizador</label>
                  <Input
                    type="text"
                    placeholder="Pesquisar por nome ou email..."
                    value={balanceUserSearchQuery}
                    onChange={(e) => {
                      setBalanceUserSearchQuery(e.target.value)
                      setShowBalanceUserSuggestions(true)
                      if (e.target.value === "") {
                        setSelectedUserId("")
                      }
                    }}
                    onFocus={() => {
                      if (balanceUserSearchQuery) {
                        setShowBalanceUserSuggestions(true)
                      }
                    }}
                    className="bg-slate-700 text-white border-slate-600"
                  />
                  {showBalanceUserSuggestions && balanceUserSearchQuery && (
                    <div className="absolute z-10 w-full mt-1 bg-slate-700 border border-slate-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {users
                        .filter((user) => {
                          const query = balanceUserSearchQuery.toLowerCase()
                          return (
                            user.name.toLowerCase().includes(query) ||
                            user.email.toLowerCase().includes(query)
                          )
                        })
                        .slice(0, 10)
                        .map((user) => (
                          <button
                            key={user.id}
                            type="button"
                            onClick={() => {
                              setSelectedUserId(user.id)
                              setBalanceUserSearchQuery(`${user.name} (${user.email})`)
                              setShowBalanceUserSuggestions(false)
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-slate-600 text-slate-200 text-sm border-b border-slate-600 last:border-b-0"
                          >
                            <div className="font-medium">{user.name}</div>
                            <div className="text-xs text-slate-400">{user.email}</div>
                            <div className="text-xs text-slate-500">Saldo: N{user.balance.toFixed(2)}</div>
                          </button>
                        ))}
                      {users.filter((user) => {
                        const query = balanceUserSearchQuery.toLowerCase()
                        return (
                          user.name.toLowerCase().includes(query) ||
                          user.email.toLowerCase().includes(query)
                        )
                      }).length === 0 && (
                        <div className="px-4 py-2 text-slate-400 text-sm">
                          Nenhum utilizador encontrado
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {selectedUserId && (
                  <div className="p-3 bg-slate-700 rounded-lg">
                    <p className="text-sm text-slate-300">
                      Utilizador selecionado: <span className="font-semibold text-white">
                        {users.find(u => u.id === selectedUserId)?.name} ({users.find(u => u.id === selectedUserId)?.email})
                      </span>
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Saldo atual: N{users.find(u => u.id === selectedUserId)?.balance.toFixed(2) || '0.00'}
                    </p>
                  </div>
                )}
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Valor (positivo para adicionar, negativo para remover)"
                  value={balanceAmount}
                  onChange={(e) => setBalanceAmount(e.target.value)}
                  className="bg-slate-700 text-white border-slate-600"
                />
                <p className="text-xs text-slate-400">
                  Use valores positivos para adicionar saldo, negativos para remover (ex: -5.00)
                </p>
                <div>
                  <label className="block text-sm text-slate-300 mb-2">Método de Pagamento</label>
                  <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
                    <button
                      type="button"
                      onClick={() => setDepositMethod('cash')}
                      className={`flex-shrink-0 px-6 py-4 rounded-lg border-2 transition-all ${
                        depositMethod === 'cash'
                          ? 'bg-slate-700 border-cyan-500 shadow-lg shadow-cyan-500/20'
                          : 'bg-slate-700 border-slate-600 hover:border-slate-500'
                      }`}
                    >
                      <div className="text-white font-semibold text-lg mb-1">Dinheiro</div>
                      <div className="text-xs text-slate-400">Pagamento em dinheiro</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDepositMethod('mbway')}
                      className={`flex-shrink-0 px-6 py-4 rounded-lg border-2 transition-all ${
                        depositMethod === 'mbway'
                          ? 'bg-slate-700 border-cyan-500 shadow-lg shadow-cyan-500/20'
                          : 'bg-slate-700 border-slate-600 hover:border-slate-500'
                      }`}
                    >
                      <div className="text-white font-semibold text-lg mb-1">MB Way</div>
                      <div className="text-xs text-slate-400">Transferência MB Way</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDepositMethod('adjustment')}
                      className={`flex-shrink-0 px-6 py-4 rounded-lg border-2 transition-all ${
                        depositMethod === 'adjustment'
                          ? 'bg-slate-700 border-cyan-500 shadow-lg shadow-cyan-500/20'
                          : 'bg-slate-700 border-slate-600 hover:border-slate-500'
                      }`}
                    >
                      <div className="text-white font-semibold text-lg mb-1">Ajuste</div>
                      <div className="text-xs text-slate-400">Ajuste manual</div>
                    </button>
                  </div>
                </div>
                <Button onClick={handleAddBalance} className="w-full bg-cyan-500 hover:bg-cyan-600">
                  {balanceAmount && Number.parseFloat(balanceAmount) < 0 ? 'Remover Saldo' : 'Adicionar Depósito'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Stock Management Tab */}
          <TabsContent value="stock">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-slate-200">Gestão de Produtos</CardTitle>
                  <Button 
                    onClick={() => {
                      setIsAddingProduct(true)
                      setEditingProduct(null)
                    }}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Adicionar Produto
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add New Product Form */}
                {isAddingProduct && (
                  <Card className="bg-slate-700 border-slate-600 p-4">
                    <CardTitle className="text-slate-200 mb-4 text-lg">Novo Produto</CardTitle>
                    <div className="space-y-3">
                      <Input
                        placeholder="Nome do produto"
                        value={newProduct.name}
                        onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                        className="bg-slate-600 text-white border-slate-500"
                      />
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Preço de compra (N)"
                        value={newProduct.purchasePrice}
                        onChange={(e) => setNewProduct({ ...newProduct, purchasePrice: e.target.value })}
                        className="bg-slate-600 text-white border-slate-500"
                      />
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Preço de venda membro (N)"
                        value={newProduct.sellingPriceMember}
                        onChange={(e) => setNewProduct({ ...newProduct, sellingPriceMember: e.target.value })}
                        className="bg-slate-600 text-white border-slate-500"
                      />
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Preço de venda não-membro (N)"
                        value={newProduct.sellingPriceNonMember}
                        onChange={(e) => setNewProduct({ ...newProduct, sellingPriceNonMember: e.target.value })}
                        className="bg-slate-600 text-white border-slate-500"
                      />
                      <Input
                        type="number"
                        placeholder="Stock inicial"
                        value={newProduct.stock}
                        onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
                        className="bg-slate-600 text-white border-slate-500"
                      />
                      <Input
                        placeholder="URL da imagem"
                        value={newProduct.image}
                        onChange={(e) => setNewProduct({ ...newProduct, image: e.target.value })}
                        className="bg-slate-600 text-white border-slate-500"
                      />
                      <div className="flex gap-2">
                        <Button onClick={handleAddProduct} className="flex-1 bg-green-600 hover:bg-green-700">
                          Adicionar
                        </Button>
                        <Button onClick={handleCancelEdit} variant="outline" className="flex-1">
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Edit Product Form */}
                {editingProduct && (
                  <Card className="bg-slate-700 border-slate-600 p-4">
                    <CardTitle className="text-slate-200 mb-4 text-lg">Editar Produto</CardTitle>
                    <div className="space-y-3">
                      <Input
                        placeholder="Nome do produto"
                        value={editingProduct.name}
                        onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                        className="bg-slate-600 text-white border-slate-500"
                      />
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Preço de compra (N)"
                        value={editingProduct.purchasePrice}
                        onChange={(e) => setEditingProduct({ ...editingProduct, purchasePrice: Number.parseFloat(e.target.value) || 0 })}
                        className="bg-slate-600 text-white border-slate-500"
                      />
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Preço de venda membro (N)"
                        value={editingProduct.sellingPriceMember}
                        onChange={(e) => setEditingProduct({ ...editingProduct, sellingPriceMember: Number.parseFloat(e.target.value) || 0 })}
                        className="bg-slate-600 text-white border-slate-500"
                      />
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Preço de venda não-membro (N)"
                        value={editingProduct.sellingPriceNonMember}
                        onChange={(e) => setEditingProduct({ ...editingProduct, sellingPriceNonMember: Number.parseFloat(e.target.value) || 0 })}
                        className="bg-slate-600 text-white border-slate-500"
                      />
                      <div className="space-y-2">
                        <Input
                          type="number"
                          placeholder="Stock"
                          value={editingProduct.stock}
                          onChange={(e) => {
                            const newStock = Number.parseInt(e.target.value) || 0
                            setEditingProduct({ ...editingProduct, stock: newStock })
                            // Reset checkbox if stock increases back
                            if (newStock >= editingProductOriginalStock) {
                              setMarkAsStolen(false)
                            }
                          }}
                          className="bg-slate-600 text-white border-slate-500"
                        />
                        {editingProduct.stock < editingProductOriginalStock && (
                          <div className="p-3 bg-red-900/20 border border-red-600/30 rounded-lg">
                            <div className="flex items-start gap-2">
                              <input
                                type="checkbox"
                                id="markAsStolen"
                                checked={markAsStolen}
                                onChange={(e) => setMarkAsStolen(e.target.checked)}
                                className="w-4 h-4 mt-0.5 text-red-600 bg-slate-600 border-slate-500 rounded focus:ring-red-500"
                              />
                              <div className="flex-1">
                                <label htmlFor="markAsStolen" className="text-slate-200 text-sm font-medium cursor-pointer block">
                                  Marcar como roubado/perdido
                                </label>
                                <p className="text-xs text-slate-400 mt-1">
                                  {markAsStolen 
                                    ? `Esta perda de ${editingProductOriginalStock - editingProduct.stock} unidades será registada como roubado/perdido no histórico.`
                                    : `Stock diminuiu ${editingProductOriginalStock - editingProduct.stock} unidades. Marque esta opção se foi roubado/perdido.`
                                  }
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                        {editingProduct.stock > editingProductOriginalStock && (
                          <p className="text-xs text-slate-400">
                            Stock aumentou {editingProduct.stock - editingProductOriginalStock} unidades
                          </p>
                        )}
                      </div>
                      <Input
                        placeholder="URL da imagem"
                        value={editingProduct.image || ""}
                        onChange={(e) => setEditingProduct({ ...editingProduct, image: e.target.value })}
                        className="bg-slate-600 text-white border-slate-500"
                      />
                      <div className="flex gap-2">
                        <Button onClick={handleSaveProduct} className="flex-1 bg-cyan-500 hover:bg-cyan-600">
                          Guardar
                        </Button>
                        <Button onClick={handleCancelEdit} variant="outline" className="flex-1">
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Products Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-slate-200 min-w-[600px]">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="text-left p-2">Nome</th>
                        <th className="text-left p-2">Compra</th>
                        <th className="text-left p-2">Venda Membro</th>
                        <th className="text-left p-2">Venda Não-Membro</th>
                        <th className="text-left p-2">Margem Membro</th>
                        <th className="text-left p-2">Margem Não-Membro</th>
                        <th className="text-left p-2">Stock</th>
                        <th className="text-left p-2">Valor Stock</th>
                        <th className="text-left p-2">Imagem</th>
                        <th className="text-left p-2">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="p-4 text-center text-slate-400">
                            Nenhum produto encontrado
                          </td>
                        </tr>
                      ) : (
                        products.map((product) => {
                          const memberMargin = product.sellingPriceMember - product.purchasePrice
                          const nonMemberMargin = product.sellingPriceNonMember - product.purchasePrice
                          const memberMarginPercent = product.purchasePrice > 0 ? ((memberMargin / product.purchasePrice) * 100) : 0
                          const nonMemberMarginPercent = product.purchasePrice > 0 ? ((nonMemberMargin / product.purchasePrice) * 100) : 0
                          const stockValue = product.purchasePrice * product.stock
                          
                          return (
                            <tr key={product.id} className="border-b border-slate-700">
                              <td className="p-2 font-medium">{product.name}</td>
                              <td className="p-2">N{product.purchasePrice.toFixed(2)}</td>
                              <td className="p-2">N{product.sellingPriceMember.toFixed(2)}</td>
                              <td className="p-2">N{product.sellingPriceNonMember.toFixed(2)}</td>
                              <td className="p-2">
                                <div className="text-sm">
                                  <div className="text-green-400">N{memberMargin.toFixed(2)}</div>
                                  <div className="text-xs text-slate-400">{memberMarginPercent.toFixed(1)}%</div>
                                </div>
                              </td>
                              <td className="p-2">
                                <div className="text-sm">
                                  <div className="text-green-400">N{nonMemberMargin.toFixed(2)}</div>
                                  <div className="text-xs text-slate-400">{nonMemberMarginPercent.toFixed(1)}%</div>
                                </div>
                              </td>
                              <td className="p-2">
                                <span className={`font-semibold ${product.stock <= 0 ? 'text-red-400' : product.stock < 5 ? 'text-yellow-400' : 'text-white'}`}>
                                  {product.stock}
                                </span>
                              </td>
                              <td className="p-2 text-sm text-slate-400">N{stockValue.toFixed(2)}</td>
                              <td className="p-2">
                                {product.image ? (
                                  <img 
                                    src={product.image} 
                                    alt={product.name} 
                                    className="w-10 h-10 object-cover rounded"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement
                                      if (!target.dataset.fallbackAttempted && !target.src.includes('data:image')) {
                                        target.dataset.fallbackAttempted = 'true'
                                        target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2U1ZTdlYiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg=='
                                      }
                                    }}
                                  />
                                ) : (
                                  <span className="text-slate-500 text-xs">Sem imagem</span>
                                )}
                              </td>
                              <td className="p-2">
                                <div className="flex gap-2">
                                  <Button
                                    onClick={() => handleEditProduct(product)}
                                    variant="outline"
                                    size="sm"
                                    className="bg-slate-600 hover:bg-slate-500"
                                  >
                                    Editar
                                  </Button>
                                  <Button
                                    onClick={() => handleDeleteProduct(product.id)}
                                    variant="outline"
                                    size="sm"
                                    className="bg-red-600 hover:bg-red-700 text-white"
                                  >
                                    Remover
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Inactive Products Section */}
                {inactiveProducts.length > 0 && (
                  <div className="mt-8 pt-8 border-t border-slate-700">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-200 mb-1">
                          Produtos Removidos ({inactiveProducts.length})
                        </h3>
                        <p className="text-sm text-slate-400">
                          Produtos que foram removidos mas mantidos no histórico de encomendas
                        </p>
                      </div>
                      <Button
                        onClick={() => setShowInactiveProducts(!showInactiveProducts)}
                        variant="outline"
                        size="sm"
                        className="bg-slate-600 hover:bg-slate-500"
                      >
                        {showInactiveProducts ? 'Ocultar' : 'Mostrar'}
                      </Button>
                    </div>

                    {showInactiveProducts && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-slate-200 min-w-[600px] opacity-75">
                          <thead>
                            <tr className="border-b border-slate-700">
                              <th className="text-left p-2">Nome</th>
                              <th className="text-left p-2">Compra</th>
                              <th className="text-left p-2">Venda Membro</th>
                              <th className="text-left p-2">Venda Não-Membro</th>
                              <th className="text-left p-2">Stock</th>
                              <th className="text-left p-2">Imagem</th>
                              <th className="text-left p-2">Ações</th>
                            </tr>
                          </thead>
                          <tbody>
                            {inactiveProducts.map((product) => (
                              <tr key={product.id} className="border-b border-slate-700">
                                <td className="p-2 font-medium text-slate-400">{product.name}</td>
                                <td className="p-2 text-slate-400">N{product.purchasePrice.toFixed(2)}</td>
                                <td className="p-2 text-slate-400">N{product.sellingPriceMember.toFixed(2)}</td>
                                <td className="p-2 text-slate-400">N{product.sellingPriceNonMember.toFixed(2)}</td>
                                <td className="p-2 text-slate-400">{product.stock}</td>
                                <td className="p-2">
                                  {product.image ? (
                                    <img 
                                      src={product.image} 
                                      alt={product.name} 
                                      className="w-10 h-10 object-cover rounded opacity-50"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement
                                        if (!target.dataset.fallbackAttempted && !target.src.includes('data:image')) {
                                          target.dataset.fallbackAttempted = 'true'
                                          target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2U1ZTdlYiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg=='
                                        }
                                      }}
                                    />
                                  ) : (
                                    <span className="text-slate-500 text-xs">Sem imagem</span>
                                  )}
                                </td>
                                <td className="p-2">
                                  <Button
                                    onClick={() => handleRestoreProduct(product.id)}
                                    variant="outline"
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                  >
                                    Restaurar
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/*NECC tab*/}
          <TabsContent value="Necc">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-slate-200">Gestão Financeira & Estatísticas</CardTitle>
                  <Button
                    onClick={() => setShowHelpModal(true)}
                    variant="outline"
                    size="sm"
                    className="bg-slate-700 hover:bg-slate-600 text-slate-200"
                  >
                    <HelpCircle className="w-4 h-4 mr-2" />
                    Ajuda
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Valor Total Disponível (Editável) */}
                <div className="bg-slate-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-slate-300 text-sm font-medium">Valor Total Disponível</label>
                    {!editingAvailableCash && (
                      <Button
                        onClick={handleEditAvailableCash}
                        variant="outline"
                        size="sm"
                        className="bg-cyan-600 hover:bg-cyan-700 text-white text-xs"
                      >
                        Editar
                      </Button>
                    )}
                  </div>
                  {editingAvailableCash ? (
                    <div className="space-y-3">
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Valor disponível"
                        value={availableCashInput}
                        onChange={(e) => setAvailableCashInput(e.target.value)}
                        className="bg-slate-600 text-white border-slate-500"
                      />
                      <Input
                        type="text"
                        placeholder="Motivo do ajuste (opcional)"
                        value={availableCashReason}
                        onChange={(e) => setAvailableCashReason(e.target.value)}
                        className="bg-slate-600 text-white border-slate-500"
                      />
                      <p className="text-xs text-slate-400">
                        Este é o dinheiro disponível para comprar mais stock. O motivo será guardado no log.
                      </p>
                      <div className="flex gap-2">
                        <Button onClick={handleSaveAvailableCash} className="flex-1 bg-green-600 hover:bg-green-700">
                          Guardar
                        </Button>
                        <Button onClick={handleCancelEditAvailableCash} variant="outline" className="flex-1">
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-3xl font-bold text-white">N{availableCash.toFixed(2)}</p>
                      <p className="text-xs text-slate-400 mt-1">Dinheiro disponível para comprar stock</p>
                    </>
                  )}
                </div>

                {/* Grid de Métricas Principais */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-slate-700 rounded-lg p-4">
                    <label className="block text-slate-300 mb-2 text-sm">Valor em Stock</label>
                    <p className="text-3xl font-bold text-blue-400">N{totalStockValue.toFixed(2)}</p>
                    <p className="text-xs text-slate-400 mt-1">Custo total do stock atual (preço de compra)</p>
                  </div>
                  
                  <div className="bg-slate-700 rounded-lg p-4">
                    <label className="block text-slate-300 mb-2 text-sm">Lucro Esperado</label>
                    <p className="text-3xl font-bold text-yellow-400">N{expectedProfit.toFixed(2)}</p>
                    <p className="text-xs text-slate-400 mt-1">Se todos comprarem como sócios (preço sócio - preço compra) × stock</p>
                  </div>
                  
                  <div className="bg-slate-700 rounded-lg p-4">
                    <label className="block text-slate-300 mb-2 text-sm">Lucro Real</label>
                    <p className="text-3xl font-bold text-green-400">N{actualProfit.toFixed(2)}</p>
                    <p className="text-xs text-slate-400 mt-1">Receita - Custo das mercadorias vendidas</p>
                  </div>
                  
                  <div className="bg-slate-700 rounded-lg p-4">
                    <label className="block text-slate-300 mb-2 text-sm">Valor Total em Saldo</label>
                    <p className="text-3xl font-bold text-cyan-400">N{totalUserBalances.toFixed(2)}</p>
                    <p className="text-xs text-slate-400 mt-1">Soma dos saldos de todos os utilizadores</p>
                  </div>
                  
                  <div className="bg-slate-700 rounded-lg p-4">
                    <label className="block text-slate-300 mb-2 text-sm">Total Comprado</label>
                    <p className="text-3xl font-bold text-purple-400">N{totalPurchased.toFixed(2)}</p>
                    <p className="text-xs text-slate-400 mt-1">Valor total de todas as compras no SNecc-Bar</p>
                  </div>
                </div>
                
                {/* Estatísticas de Receita */}
                <div className="border-t border-slate-700 pt-4">
                  <h3 className="text-slate-200 font-semibold mb-3">Estatísticas de Receita</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-slate-700 rounded-lg p-3">
                      <p className="text-xs text-slate-400 mb-1">Receita Total</p>
                      <p className="text-xl font-bold text-white">N{totalRevenue.toFixed(2)}</p>
                    </div>
                    <div className="bg-slate-700 rounded-lg p-3">
                      <p className="text-xs text-slate-400 mb-1">Pago com Saldo</p>
                      <p className="text-xl font-bold text-cyan-400">N{revenueFromBalance.toFixed(2)}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {totalRevenue > 0 ? ((revenueFromBalance / totalRevenue) * 100).toFixed(1) : 0}% do total
                      </p>
                    </div>
                    <div className="bg-slate-700 rounded-lg p-3">
                      <p className="text-xs text-slate-400 mb-1">Pago em Dinheiro</p>
                      <p className="text-xl font-bold text-green-400">N{revenueFromCash.toFixed(2)}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {totalRevenue > 0 ? ((revenueFromCash / totalRevenue) * 100).toFixed(1) : 0}% do total
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Estatísticas de Produtos */}
                <div className="border-t border-slate-700 pt-4">
                  <h3 className="text-slate-200 font-semibold mb-3">Estatísticas de Produtos</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-slate-700 rounded-lg p-3">
                      <p className="text-xs text-slate-400 mb-1">Total de Produtos</p>
                      <p className="text-xl font-bold text-white">{totalProducts}</p>
                    </div>
                    <div className="bg-slate-700 rounded-lg p-3">
                      <p className="text-xs text-slate-400 mb-1">Produtos em Stock</p>
                      <p className="text-xl font-bold text-green-400">
                        {products.filter(p => p.stock > 0).length}
                      </p>
                    </div>
                    <div className="bg-slate-700 rounded-lg p-3">
                      <p className="text-xs text-slate-400 mb-1">Produtos Sem Stock</p>
                      <p className="text-xl font-bold text-red-400">
                        {products.filter(p => p.stock <= 0).length}
                      </p>
                    </div>
                  </div>
                </div>

              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Explicação dos Valores Financeiros</h2>
              <Button
                onClick={() => setShowHelpModal(false)}
                variant="ghost"
                size="sm"
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Valor Total Disponível</h3>
                <p className="text-slate-300 text-sm mb-2">
                  Este é o dinheiro disponível que o núcleo tem para comprar mais stock. Pode ser editado manualmente sempre que necessário.
                </p>
                <p className="text-slate-400 text-xs">
                  <strong>Como usar:</strong> Quando comprarem stock, devem atualizar este valor subtraindo o custo da compra.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Valor em Stock</h3>
                <p className="text-slate-300 text-sm mb-2">
                  Representa o custo total do stock atual, calculado multiplicando a quantidade de cada produto pelo seu preço de compra.
                </p>
                <p className="text-slate-400 text-xs">
                  <strong>Cálculo:</strong> Soma de (preço de compra × quantidade em stock) para todos os produtos.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Lucro Esperado</h3>
                <p className="text-slate-300 text-sm mb-2">
                  O lucro que se espera obter se todo o stock atual for vendido ao preço de sócio.
                </p>
                <p className="text-slate-400 text-xs">
                  <strong>Cálculo:</strong> Soma de ((preço de venda sócio - preço de compra) × quantidade em stock) para todos os produtos.
                </p>
                <p className="text-slate-400 text-xs mt-1">
                  <strong>Nota:</strong> Vendas a não-sócios geram lucro adicional, pois pagam mais do que o preço de sócio.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Lucro Real</h3>
                <p className="text-slate-300 text-sm mb-2">
                  O lucro efetivamente obtido com as vendas já realizadas, calculado como a diferença entre a receita total e o custo das mercadorias vendidas.
                </p>
                <p className="text-slate-400 text-xs">
                  <strong>Cálculo:</strong> Receita Total - Custo das Mercadorias Vendidas (preço de compra × quantidade vendida).
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Valor Total em Saldo</h3>
                <p className="text-slate-300 text-sm mb-2">
                  A soma de todos os saldos dos utilizadores. Representa o dinheiro que os utilizadores têm disponível para comprar produtos.
                </p>
                <p className="text-slate-400 text-xs">
                  <strong>Cálculo:</strong> Soma dos saldos de todos os utilizadores registados.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Total Comprado</h3>
                <p className="text-slate-300 text-sm mb-2">
                  O valor total de todas as compras realizadas no SNecc-Bar, independentemente do método de pagamento.
                </p>
                <p className="text-slate-400 text-xs">
                  <strong>Cálculo:</strong> Soma do valor total de todas as encomendas registadas.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Estatísticas de Receita</h3>
                <p className="text-slate-300 text-sm mb-2">
                  Breakdown da receita total por método de pagamento:
                </p>
                <ul className="text-slate-400 text-xs space-y-1 ml-4">
                  <li><strong>Receita Total:</strong> Soma de todas as vendas realizadas</li>
                  <li><strong>Pago com Saldo:</strong> Vendas pagas usando o saldo dos utilizadores</li>
                  <li><strong>Pago em Dinheiro:</strong> Vendas pagas diretamente em dinheiro</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Estatísticas de Produtos</h3>
                <p className="text-slate-300 text-sm mb-2">
                  Informações sobre o inventário de produtos:
                </p>
                <ul className="text-slate-400 text-xs space-y-1 ml-4">
                  <li><strong>Total de Produtos:</strong> Número total de produtos diferentes no sistema</li>
                  <li><strong>Produtos em Stock:</strong> Produtos com quantidade disponível maior que zero</li>
                  <li><strong>Produtos Sem Stock:</strong> Produtos com quantidade igual a zero</li>
                </ul>
              </div>
            </div>
            <div className="sticky bottom-0 bg-slate-800 border-t border-slate-700 p-4 flex justify-end">
              <Button
                onClick={() => setShowHelpModal(false)}
                className="bg-cyan-600 hover:bg-cyan-700"
              >
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AdminPage() {
  return (
    <AlertProvider>
      <AdminPageContent />
    </AlertProvider>
  )
}
