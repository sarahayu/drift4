import { useQuery } from "@tanstack/react-query";
import { getMeasureFullTS, getMeasureSelection } from "utils/Queries";

const useProsodicMeasures = ({ id, selection, docReady }) => {
    const {
        isSuccess: fullTSProsMeasuresSuccess,
        isFetching: fullTSProsMeasuresFetching,
        data: fullTSProsMeasures,
    } = useQuery(['prosodicMeasures', 'fullTranscript', id], () => getMeasureFullTS(id),  { enabled: docReady }
    );

    const {
        isSuccess: selectionProsMeasuresSuccess,
        isFetching: selectionProsMeasuresFetching,
        data: selectionProsMeasures,
    } = useQuery(['prosodicMeasures', selection, id], () => getMeasureSelection(id, selection.start_time, selection.end_time),  { 
            enabled: docReady && !!selection.start_time  
    });

    // check for fetching so data table isn't using stale data to populate table 
    // (even if it is valid, e.g. turning on intensive measures and adding addt. Dynamism measures)
    return {
        fullTSProsMeasuresReady: fullTSProsMeasuresSuccess && !fullTSProsMeasuresFetching,
        fullTSProsMeasures,
        selectionProsMeasuresReady: selectionProsMeasuresSuccess && !selectionProsMeasuresFetching,
        selectionProsMeasures,
    };
};

export default useProsodicMeasures;