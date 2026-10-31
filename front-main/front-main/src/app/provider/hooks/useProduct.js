import {useEffect, useMemo, useState} from "react";
import RelationService from "../../services/RelationService";
import Logger from "../../../shared/internal/Logger";
import ProductService from "../../services/productService";


export function useProduct() {

    const logger = useMemo(()=>new Logger('useProduct'), []);

    const [shopItems, setShopItems] = useState([])
    const [orders, setOrders] = useState([])
    const [totalItems, setTotalItems] = useState(0)
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState([])
    const [limit, setLimit] = useState(20)
    const [isProductsLoading, setIsProductsLoading] = useState(false);

    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(false)


    async function getProductById(id) {
        if (!id) return;

        setIsLoading(true)
        try {
            const response = await ProductService.getProduct(id)

            return response.data
        } catch (e) {
            logger.error(e);
            // setError(e.response?.data?.message)
        } finally {
            setIsLoading(false)
        }


    }


    async function getProducts() {
        setIsLoading(true)
        try {
            const response = await ProductService.getProducts()
            setProducts(response.data)
        } catch (e) {
            console.error(e);
            // setError(e.response?.data?.message)
        } finally {
            setIsLoading(false)
        }

    }

    async function createProduct({name, ingredients}) {
        setIsLoading(true)
        try {
            const response = await ProductService.createProduct(name,ingredients)

            return response.data
        } catch (e) {
            logger.error(e);
            // setError(e.response?.data?.message)
        } finally {
            setIsLoading(false)
        }
    }

    async function deleteProduct({productId}) {
        setIsLoading(true)
        try {
            const response = await ProductService.deleteProduct(productId)

            return response.data
        } catch (e) {
            logger.error(e);
            // setError(e.response?.data?.message)
        } finally {
            setIsLoading(false)
        }
    }

    async function updateProduct({productId, name, ingredients}) {
        setIsLoading(true)
        try {
            const response = await ProductService.updateProduct(productId, name, ingredients)

            return response.data
        } catch (e) {
            logger.error(e);
            // setError(e.response?.data?.message)
        } finally {
            setIsLoading(false)
        }
    }


    return {
        // shopItems, setShopItems,
        // orders, setOrders,
        // limit, setLimit,
        // totalPages,setTotalPages,
        // currentPage, setCurrentPage,
        // totalItems, setTotalItems,
        // isProductsLoading, setIsProductsLoading,

        products, getProducts,
        createProduct, deleteProduct, updateProduct, isLoading,
        getProductById,
    }
}