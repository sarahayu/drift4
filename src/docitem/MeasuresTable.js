import { useContext } from "react";
import { GutsContext } from "../GutsContext";
import { filterStats, LABEL_DESCRIPTIONS, LABEL_HEADERS, linkFragment, splitString, useProsodicMeasures } from "../utils/Utils";

function MeasuresTable(props) {

    const { id, docReady } = props;

    const { fullTSProsDataReady, fullTSProsData } = useProsodicMeasures(props);
    const { localhost, calcIntense } = useContext(GutsContext);

    const invalidData = fullTSProsDataReady && (
        calcIntense && !("Dynamism" in fullTSProsData)
    );

    if (invalidData) {
        console.log("Outdated full_ts found, TODO triggering new full_ts")
    }

    const tableNotReady = !docReady || !fullTSProsDataReady || invalidData;
    
    return (
        <div className="table-wrapper">
            {
                tableNotReady
                    ? <UnloadedTable />
                    : <LoadedTable { ...props }/>
            }
            {
                tableNotReady
                    && <LoadingMessage { ...{ localhost, calcIntense } }/>
            }
            {
                !tableNotReady
                    && <CopyButton id={ id } />
            }
        </div>

    );
}

function CopyButton({ id }) {

    const handleClick = () => {
        console.log("TODO copy")
    }

    return (
        <button onClick={ handleClick } className="copy-btn" id={ id + '-copy-btn' }>Copy to Clipboard</button>
    );
}

function LoadedTable(props) {
    const { fullTSProsData, selectionProsDataReady, selectionProsData } = useProsodicMeasures(props);

    const measureKeys = filterStats(fullTSProsData);

    const getLinkAttrs = measureKey => {
        if (!LABEL_DESCRIPTIONS[measureKey]) return {};

        return {
            href: linkFragment('prosodic-measures.html', LABEL_HEADERS[measureKey], (measureKey.includes('Pause_Count') ? 'Gentle_Pause_Count' : measureKey)),
            target: '_blank',
            title: splitString(LABEL_DESCRIPTIONS[measureKey], 40, 4) + '\n(Click label for more information)',
        }
    }

    return (        
        <table className="stat-table drift-table">
            <tr className="stat-header">
                <th><a className="acsblty-skip" href={ `#${props.id}-copy-btn` }>Skip table headers</a></th>
                {
                    measureKeys.map(measureKey => (
                        <th key={ measureKey }>
                            <a { ...getLinkAttrs(measureKey) }>{ measureKey.replace(/_/g, ' ') }</a>
                        </th>
                    ))
                }
            </tr>
            <tr>
                <th>full recording duration</th>
                <TableDataRow labelsToPrint={ measureKeys } data={ fullTSProsData } />
            </tr>
            <tr>
                <th>selection</th>
                <TableDataRow labelsToPrint={ measureKeys } data={ selectionProsDataReady && selectionProsData } />
            </tr>
        </table>
    );
}

function TableDataRow({ labelsToPrint, data }) {
    return (
        labelsToPrint.map(label => 
            <td key={ label }>
                {
                    data
                    ? (
                        isNaN(data[label])
                        ? data[label]
                        : Math.round(data[label] * 100) / 100
                    )
                    : "..."
                }
            </td>
        )
    )
}

function UnloadedTable() {
    return (        
        <table className="stat-table drift-table">
            <tr className="stat-header">
                <th></th>
            </tr>
            <tr>
                <th>full recording duration</th>
            </tr>
            <tr>
                <th>selection</th>
            </tr>
        </table>
    );
}

function LoadingMessage({ localhost, calcIntense }) {

    if (!localhost || !calcIntense)
        return (
            <p className="table-loading">Loading... This may take a few minutes the first time you open this document.</p>
        );

    return (
        <p className="table-loading">
            Loading... This may take a few minutes the first time you open this document.
            You can speed this up by disabling intensive measures in 
            <i> Settings </i>
            <img src="settings.svg" className="intext-icon" />
        </p>
    )
}

export default MeasuresTable;