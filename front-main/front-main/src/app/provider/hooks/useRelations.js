import React, {useMemo, useState} from "react";
import Logger from "../../../shared/internal/Logger";
import RelationService from "../../services/RelationService";

export default function useRelations() {

    const logger = useMemo(()=>new Logger('useRelations'), []);
    const [isLoading, setIsLoading] = useState(false)
    const [relations, setRelations] = useState([]);
    const [relationsProducts, setRelationsProducts] = useState([]);

    async function getRelations() {
        setIsLoading(true)
        try {
            const response = await RelationService.getRelations()
            setRelations(response.data)
        } catch (e) {
            console.error(e);
            // setError(e.response?.data?.message)
        } finally {
            setIsLoading(false)
        }

    }

    async function createRelation({name, category}) {
        setIsLoading(true)
        try {
            const response = await RelationService.createRelation(name,category)

            return response.data
        } catch (e) {
            logger.error(e);
            // setError(e.response?.data?.message)
        } finally {
            setIsLoading(false)
        }
    }

    async function deleteRelation({relationId}) {
        setIsLoading(true)
        try {
            const response = await RelationService.deleteRelation(relationId)

            return response.data
        } catch (e) {
            logger.error(e);
            // setError(e.response?.data?.message)
        } finally {
            setIsLoading(false)
        }
    }

    async function updateRelation({relationId, name}) {
        setIsLoading(true)
        try {
            const response = await RelationService.updateRelation(relationId, name)

            return response.data
        } catch (e) {
            logger.error(e);
            // setError(e.response?.data?.message)
        } finally {
            setIsLoading(false)
        }
    }

    async function addProduct({productId, relationId, price}) {
        setIsLoading(true)
        console.log('PRICEEEEEE', price)
        try {
            const response = await RelationService.addProduct(productId, relationId, price)

            return response.data
        } catch (e) {
            logger.error(e);
            // setError(e.response?.data?.message)
        } finally {
            setIsLoading(false)
        }

    }

    async function getRelationsProducts({relationId}) {
        setIsLoading(true)
        try {
            const response = await RelationService.getRelationsProducts(relationId)
            setRelationsProducts(response.data.products)

            return response.data
        } catch (e) {
            logger.error(e);
            // setError(e.response?.data?.message)
        } finally {
            setIsLoading(false)
        }

    }

    async function updateRelationProduct({relationId, productId, price}) {
        setIsLoading(true)
        try {
            const response = await RelationService.updateRelationProduct(relationId, productId, price)
            // setRelationsProducts(response.data)

            return response.data
        } catch (e) {
            logger.error(e);
            // setError(e.response?.data?.message)
        } finally {
            setIsLoading(false)
        }

    }

    async function deleteRelationProduct({relationId, productId}) {
        setIsLoading(true)
        try {
            const response = await RelationService.deleteRelationProduct(relationId, productId)
            // setRelationsProducts(response.data)

            return response.data
        } catch (e) {
            logger.error(e);
            // setError(e.response?.data?.message)
        } finally {
            setIsLoading(false)
        }

    }

    return ({
        relations,
        getRelations, createRelation,
        deleteRelation, updateRelation,
        isLoading,
        addProduct,
        relationsProducts,getRelationsProducts,
        updateRelationProduct, deleteRelationProduct
    })
}