import React from "react";
import {Block, Input} from "../../shared/ui";
import SearchIcon from "../../shared/assets/icons/search_24dp_FILL0_wght400_GRAD0_opsz24.svg";

export function Search({searchText='', setSearchText=f=>f, placeholder=''}) {

    return (<>
        <Block marginBottom={5}
               isAir={true}
        >
            <Input
                name={'search'}
                placeholder={placeholder ? placeholder : 'Поиск товаров'}
                value={searchText}
                isIcon
                isClearable
                Icon={<SearchIcon />}
                isAnotherChange={true}
                onChange={setSearchText}
            />
        </Block>
    </>)
}