import React, {useEffect, useState} from "react";
import {Block, Button, Typography} from "../../shared/ui";
import {useAppContext} from "../../app/provider/AppContextProvider";
import useToggle from "../../shared/hooks/useToggle";
import {RelationsCreate} from "../../features/relations/create/RelationsCreate";
import {RelationCard} from "../../entities/relations/RelationCard/RelationCard";
import {Search} from "../Search/Search";

export function RelationsManage({category='clients'}) {

    const { relationsHandler } = useAppContext()
    const { relations, getRelations } = relationsHandler

    const [filteredRelations, setFilteredRelations] = useState([])
    const [searchedRelations, setSearchedRelations] = useState([])

    const [isRelationCreate, toggleRelationCreate] = useToggle()

    const [searchText, setSearchText] = useState('')

    useEffect(() => {
        (async () => {
            await getRelations()
        })()
        setFilteredRelations(relations.filter(r => r.category === category))
        console.log('ALL RELATIONS', relations)
    }, []);

    useEffect(() => {
        setFilteredRelations(relations.filter(r => r.category === category))
    }, [relations]);

    useEffect(() => {
        setSearchedRelations(filteredRelations.filter(item =>
            item.name.toLowerCase().includes(searchText.toLowerCase())
        ))
    }, [searchText])

    return (<>
        <Block width={'100%'}>
            {isRelationCreate && <RelationsCreate category={category} onClose={toggleRelationCreate} />}

            <Block marginBottom={20}>
                {/*<Typography size={24} weight={700} text={'Управление сотрудниками'}/>*/}
                <Button width={'fit-content'} marginTop={10} onClick={toggleRelationCreate}>Добавить</Button>
            </Block>

            <Search setSearchText={setSearchText} searchText={searchText} placeholder={`Поиск ${category === 'clients' ? 'клиентов' : 'поставщиков'}`}/>

            {filteredRelations.length < 1 && <Typography size={16} weight={400} text={`Нет ${category === 'clients' ? 'клиентов' : 'поставщиков'}. Добавьте.`}/>}

            {searchText && searchedRelations.length < 1 && filteredRelations.length > 0 &&
                <Block marginTop={12}>
                    <Typography size={16} weight={400} text={`По поисковому запросу ничего не найдено.`}/>
                </Block>
            }


            {searchText === '' && filteredRelations.map( (e, eid) => {
                return <RelationCard key={eid} data={e} />
            })}

            {searchText && searchedRelations.map( (e, eid) => {
                return <RelationCard key={eid} data={e} />
            })}

        </Block>

    </>)
}