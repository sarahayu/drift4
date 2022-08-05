import { useContext, useEffect } from "react";
import { GutsContext } from './GutsContext';

function DocArea(props) 
{
    const { docs } = useContext(GutsContext);

    return (
        <>
        {
            Object.entries(docs).map(([ind, doc]) => 
                <div key={ ind }>{ doc.title }</div>
            )
        }
        </>
    );
}

export default DocArea;