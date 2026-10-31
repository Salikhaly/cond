import React from "react";
import styles from './RelationCard.module.css'
import {Button, Link, Typography} from "../../../shared/ui";
import DeleteIcon from '../../../shared/assets/icons/delete_24dp_FILL0_wght400_GRAD0_opsz24.svg'
import EditIcon from '../../../shared/assets/icons/edit_24dp_5F6368_FILL0_wght400_GRAD0_opsz24.svg'
import {useAppContext} from "../../../app/provider/AppContextProvider";
import useToggle from "../../../shared/hooks/useToggle";
import {RelationUpdate} from "../../../features/relations/update/RelationUpdate";
import {RelationDelete} from "../../../features/relations/delete/RelationDelete";
import {useNavigate} from "react-router-dom";
export function RelationCard({ data }) {
    //
    const [isRelationDelete, toggleRelationDelete] = useToggle()
    const [isRelationUpdate, toggleRelationUpdate] = useToggle()

    const navigate = useNavigate()

    return (<>

        {isRelationDelete && <RelationDelete relationId={data.id} onClose={toggleRelationDelete}/>}
        {isRelationUpdate && <RelationUpdate data={data} relationId={data.id} onClose={toggleRelationUpdate} />}

        <div className={styles.EmployeeCard}>
            <div className={styles.EmployeeCard__fio} onClick={e => navigate(`/business/${data.id}`, { state: data})}>
                <Typography size={16} weight={400} text={data.name}/>
            </div>

            <div className={styles.EmployeeCard__tools}>
                {/*<Link text={'Изменить'} size={16} onClick={toggleEmployeeUpdate} />*/}
                <Button variant={'clear'} onClick={toggleRelationUpdate} isIconic={true}> <EditIcon/> </Button>
                <Button variant={'clear'}  onClick={toggleRelationDelete} isIconic={true}> <DeleteIcon/> </Button>
            </div>
        </div>
    </>)
}