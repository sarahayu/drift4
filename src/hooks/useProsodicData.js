import { useQuery } from "@tanstack/react-query";
import { getAlign, getPitch, getRMS } from "utils/Queries";

const useProsodicData = ({ id, pitch, align, rms }) => {

    const {
        isSuccess: pitchReady,
        data: pitchData
    } = useQuery(['pitch', id], () => getPitch(pitch), { enabled: !!pitch });
    
    const {
        isSuccess: alignReady,
        data: alignData
    } = useQuery(['align', id], () => getAlign(align), { enabled: !!align });
    
    const {
        isSuccess: rmsReady,
        data: rmsData
    } = useQuery(['rms', id], () => getRMS(rms), { enabled: !!rms });
    

    return {
        pitchReady,
        pitchData,
        alignReady,
        alignData,
        rmsReady,
        rmsData,
    };
};

export default useProsodicData;