import React from "react";
import {Loader, Overlay, Typography} from "../../shared/ui";


export function Loading({ isProgress=false, progress=0}){
    return (<>
        <Overlay>
            {/*<Block isAlignCenter={true}>*/}

            {isProgress && <div>
                <Typography color={'white'} weight={600} size={32} align={'center'} text={`${progress}%`}/>
            </div>}

            <Loader color={'white'}/>
            {/*</Block>*/}
        </Overlay>
    </>);
}