import numpy as np
import pyworld
# import soundfile as sf
import librosa
import json
import time
import csv
import math
import decimal
import sys
import os
import argparse

# from lempel_ziv_complexity import lempel_ziv_complexity
from numba import jit
from scipy.signal import savgol_filter

def measure_gentle_drift(gentlecsv, driftcsv, start_time, end_time):

    entered = time.time()

    csv.field_size_limit(sys.maxsize)

    results = {}

    # GENTLE
    gentle_start = []
    gentle_end = []
    gentle_wordcount = 0
    gentle_start_time = None
    gentle_end_time = None
    # Read the Gentle align csv file
    gentle = csv.reader(gentlecsv, delimiter=' ')
    for row in gentle:
        # Save measurements as list elements
        measures = row[0].split(',')
        # for some reason, rows might be empty. Faulty csv file perhaps?
        if len(measures) != 4:
            continue
        # Start time
        if start_time and measures[2] and float(start_time) > round(float(measures[2]) * 10000)/10000:
            continue
        # End time
        if end_time and measures[3] and float(end_time) < round(float(measures[3]) * 10000)/10000:
            break
        # Ignore noise
        if measures[0] != '[noise]':
            if not (measures[1] or measures[2] or measures[3]): # ignore rows with empty cells
                continue
            gentle_wordcount += 1
            gentle_start.append(round(float(measures[2]) * 10000)/10000)
            gentle_end.append(round(float(measures[3]) * 10000)/10000)
            if gentle_start_time is None:
                gentle_start_time = round(float(measures[2]) * 10000)/10000
            gentle_end_time = float(measures[3]) * 10000/10000 # save the last length

    if gentle_end_time is None:
        gentle_end_time = 0
    if gentle_start_time is None:
        gentle_start_time = 0
    
    gentle_length = gentle_end_time - gentle_start_time

    if start_time is None or end_time is None:
        selection_duration = gentle_length
    else:
        selection_duration = end_time - start_time

    # Speaking rate calculated as words per minute, or WPM.
    # Divided by the length of the recording and normalized if the recording was longer
    # or shorter than one minute to reflect the speaking rate for 60 seconds.
    if selection_duration == 0:
        WPM = 0
    else:
        WPM = math.floor(gentle_wordcount / (selection_duration / 60))
    results["WPM"] = WPM

    # Pause counts and average pause length.
    # We do not consider pauses less than 100 ms because fully continuous speech also naturally has such brief gaps in energy,
    # nor do we consider pauses that exceed 3,000 ms (that is, 3 seconds), because they are quite rare.
    sum = 0
    start_pause = 0.5
    min_pause = 0.1
    max_pause = 3 
    pause_count = 0
    long_pause_count = 0 # pauses greater than 3,000 ms

    for x in range(0, len(gentle_end) - 1):
        tmp = gentle_start[x + 1] - gentle_end[x]
        if tmp >= min_pause and tmp <= max_pause:
            sum += tmp
            pause_count += 1
        elif (tmp > max_pause):
            long_pause_count += 1

    # Pause counts
    results["Gentle_Pause_Count_>100ms"] = pause_count

    while start_pause < max_pause:
        tmp_pause_count = 0
        for x in range(0, len(gentle_end) - 1):
            tmp = gentle_start[x + 1] - gentle_end[x]
            if tmp >= start_pause and tmp <= max_pause:
                tmp_pause_count += 1
        results[f"Gentle_Pause_Count_>{(int)(start_pause * 1000)}ms"] = tmp_pause_count
        start_pause += 0.5

    results["Gentle_Long_Pause_Count_>3000ms"] = long_pause_count

    if pause_count == 0:
        APL = 0
    else:
        APL = decimal.Decimal(sum / pause_count)
    results["Gentle_Mean_Pause_Duration_(sec)"] = float(round(APL, 2))

    # Average pause rate per second.
    pause_count = 0
    for x in range(0, len(gentle_end) - 1):
        tmp = gentle_start[x + 1] - gentle_end[x]
        if tmp >= 0.1 and tmp <= 3:
            pause_count += 1

    if gentle_length != 0:
        APR = decimal.Decimal(pause_count / gentle_length)
    else:
        APR = 0
    results["Gentle_Pause_Rate_(pause/sec)"] = float(round(APR, 3))

    # Rhythmic Complexity of Pauses
    s = []

    if len(gentle_end) > 1:
        m = decimal.Decimal(str(gentle_start[0]))
        for x in range(0, len(gentle_end)):
            while x != len(gentle_end) - 1:
                start = decimal.Decimal(str(gentle_start[x]))
                next = decimal.Decimal(str(gentle_start[x + 1]))
                end = decimal.Decimal(str(gentle_end[x]))
                pause_length = decimal.Decimal(gentle_start[x + 1] - gentle_end[x])
                # Sampled every 10 ms
                if (m >= start and m <= end): # voiced
                    s.append(1)
                    m += decimal.Decimal('.01')
                else:
                    while (m > end and m < next):
                        if (pause_length >= 0.1 and pause_length <= 3):
                            s.append(0)
                        else:
                            s.append(1)
                        m += decimal.Decimal('.01')
                    break

            if (x == len(gentle_end) - 1):
                start = decimal.Decimal(str(gentle_start[x]))
                end = decimal.Decimal(str(gentle_end[x]))
                while True:
                    if (m >= start and m <= end): # voiced
                        s.append(1)
                        m += decimal.Decimal('.01')
                    else:
                        while (m > end and m < next):
                            if (pause_length >= 0.1 and pause_length <= 3):
                                s.append(0)
                            m += decimal.Decimal('.01')
                        break

    # Normalized
    if len(s) != 0:
        CP = lempel_ziv_complexity("".join([str(i) for i in s]))
    else:
        CP = 0
    results["Gentle_Complexity_All_Pauses"] = CP * 100

    # DRIFT
    drift_time = []
    drift_pitch = []
    # Read the Drift align csv file
    init = True
    skip = True
    run = False
    ixtmp = []
    index = -1
    zero_count = 0
    int_count = 0
    temp = None
    # set skipinitialspace to True so csv can read transcript that have commas
    drift = csv.reader(driftcsv, skipinitialspace=True)
    i = 1
    for measures in drift:
        # Save measurements as list elements
        # measures = row[0].split(',')
        if init:
            init = False
            continue
        # Start time
        if start_time and float(start_time) > float(measures[0]):
            continue
        # End time
        if end_time and float(end_time) < float(measures[0]):
            continue
        # Ignore first line and filter out integer pitch values
        # Voiced pitch only
        if skip or not measures[1]:
            skip = False
            continue
        elif float(measures[1]) != 0:
            drift_time.append(float(measures[0]))
            drift_pitch.append(float(measures[1]))
            index += 1
            # Find voiced periods
            if (run is False): # start of pitch
                start = index
                run = True
            else: # run is true so save pitch to record the end
                temp = index 
        # ixtmp
        elif float(measures[1]) == 0 and run is True:
            run = False
            if temp:
                end = temp
            else:
                end = start
            ixtmp.append([start,end])

    # Pitch pre-calculations

    # Calculate f0log(ivuv)
    # ivuv is an array of the indices where vuv = 1
    f0log = []
    for p in drift_pitch: # S.SAcC.f0
        f0log.append(math.log2(p)) # f0log(ivuv)

    # Calculate f0mean
    # f0mean = 2.^(mean(f0log(ivuv)));
    f0mean = 0
    for f in f0log:
        f0mean += f
    if len(f0log) != 0:
        f0mean = math.pow(2, (f0mean / len(f0log)))
    results["Drift_f0_Mean_(hz)"] = f0mean

    # Calculate diffoctf0
    # diffoctf0 = log2(S.SAcC.f0)-log2(f0mean);
    diffoctf0 = []
    for p in drift_pitch: # S.SAcC.f0
        diffoctf0.append(math.log2(p) - math.log2(f0mean))

    # Calculate f0hist
    # f0hist = histcounts(diffoctf0,25,'BinLimits',[-1 +1]); % 1/12 octave bins
    f0hist, bin_edges = np.histogram(diffoctf0, 25, (-1, 1))

    # Calculate f0prob (probability distribution)
    # f0prob = f0hist./sum(f0hist);
    f0prob = []
    if f0hist.sum() != 0:
        for f in f0hist:
            f0prob.append(f / f0hist.sum())

    # Calculate f0log2prob
    # f0log2prob = log2(f0prob);
    f0log2prob = []
    for f in f0prob:
        if (f != 0):
            f0log2prob.append(math.log2(f))
        else: # for simplicity when calculating f0entropy
            f0log2prob.append(0)

    # Pitch Range, in octaves (range of f0)
    # max(diffoctf0(ivuv))-min(diffoctf0(ivuv));
    if len(diffoctf0) != 0:
        PR = max(diffoctf0) - min(diffoctf0)
    else:
        PR = 0
    # print('7. Pitch range:', PR, 'octaves')
    results["Drift_f0_Range_(octaves)"] = PR

    # Pitch speed and acceleration pre-calculations

    # ixtmp = contiguous(S.SAcC.vuv,1);
    # https://www.mathworks.com/matlabcentral/fileexchange/5658-contiguous-start-and-stop-indices-for-contiguous-runs

    # vdurthresh = round(dminvoice/ts);
    # ts = S.refinedF0Structure.temporalPositions(2)-S.refinedF0Structure.temporalPositions(1);
    dminvoice = .100
    if len(drift_time) != 0:
        ts = drift_time[1] - drift_time[0]
        vdurthresh = decimal.Decimal(dminvoice / ts)
    else:
        vdurthresh = 0
    vdurthresh = round(vdurthresh, 0)

    # ixallvoicebounds = ixtmp{2};
    ixvoicedbounds = []
    ixallvoicebounds = ixtmp
    for i in ixallvoicebounds:
        # ixdiff = ixallvoicebounds(:,2)-ixallvoicebounds(:,1);
        ixdiff = i[1] - i[0]
        # ixvoicedbounds = ixallvoicebounds(find(ixdiff>vdurthresh),:);
        if ixdiff > vdurthresh:
            ixvoicedbounds.append(i)

    # Pitch Speed, or speed of f0 in octaves per second
    # Pitch Acceleration, or acceleration of f0 in octaves per second squared
    f0velocity = []
    f0accel_d2 = []
    for i in range(0, len(ixvoicedbounds)): # for i = 1:size(ixvoicedbounds,1)
        # diffocttmp = diffoctf0(ixvoicedbounds(i,1):ixvoicedbounds(i,2));
        # diffocttmp is just a pitch array for one voiced period, in terms of octaves relative to the mean
        diffocttmp = []
        for j in range(ixvoicedbounds[i][0], ixvoicedbounds[i][1] + 1):
            diffocttmp.append(diffoctf0[j])
        # diffocttmpD = sgolayfilt(diffocttmpD,2,7); %smooth f0 to avoid step artifacts, esp in acceleration: span = 7, degree = 2 as per Drift3
        diffocttmp = savgol_filter(diffocttmp, polyorder = 2, window_length = min(7, len(diffocttmp)))
        # f0velocity = [f0velocity; diff(diffocttmp)/ts];
        # f0accel = [f0accel; diff(diff(diffocttmp))/ts];
        for d in np.diff(diffocttmp):
            f0velocity.append(d/ts)
        for d in np.diff(diffocttmp, n = 2):
            f0accel_d2.append(d/ts) # double diff

    # S.analysis.f0speed = mean(abs(f0velocity)) * sign(mean(f0velocity));
    sum =  0
    for v in f0velocity:
        sum += abs(v)
    if len(f0velocity) != 0:
        PS = sum / len(f0velocity)
    else:
        PS = 0

    results["Drift_f0_Mean_Abs_Velocity_(octaves/sec)"] = PS

    # S.analysis.f0contour = mean(abs(f0accel)) * sign(mean(f0accel)); %signed directionless acceleration
    sum =  0
    for v in f0accel_d2:
        sum += abs(v)
    if len(f0accel_d2) != 0:
        PA = sum / len(f0accel_d2)
    else:
        PA = 0

    results["Drift_f0_Mean_Abs_Accel_(octaves/sec^2)"] = PA

    # Pitch Entropy, or entropy for f0, indicating the predictability of pitch patterns
    # f0entropy = -sum(f0prob.*f0log2prob);
    f0entropy = 0
    for i in range(0, len(f0prob)):
        f0entropy += f0prob[i] * f0log2prob[i]
    PE = -f0entropy
    results["Drift_f0_Entropy"] = PE

    # results["Dynamism"] = (f0velocity_mean/0.1167627388 + PE/0.3331034878)/2 + CP * 100/0.6691896835

    # Output message
    print(f'SYSTEM: Finished calculating Drift and Gentle measurements (took {time.time() - entered:.2f}s)')
    
    return results

# make sure sound file is the original sampling rate if it has been converted
def measure_voxit(soundfile, sacctxt, harvesttxt, start_time, end_time):

    entered = time.time()

    if start_time is None:
        start_time = 0.0
    
    if start_time and end_time and end_time > start_time:
        duration = end_time - start_time
    else:
        duration = None

    lb_start = time.time()

    x, fs = librosa.load(soundfile, sr=None, offset=start_time, duration=duration)

    print(f'SYSTEM: Librosa took {time.time() - lb_start}s')

    # load tsacc and psacc from sacctxt
    tsacc = []
    psacc = []
    for line in sacctxt:
        data = line.split()
        if start_time and float(data[0]) < round(start_time * 10000) / 10000:
            continue
        if end_time and float(data[0]) > round(end_time * 10000) / 10000:
            continue
        tsacc.append(float(data[0]))
        # TODO filter out 60 and 50 Hz
        psacc.append(float(data[1]))
    tsacc = np.array(tsacc)
    psacc = np.array(psacc)
    
    # load timeaxis and f0 from harvesttxt
    timeaxis = []
    f0 = []
    fullf0 = []
    for line in harvesttxt:
        data = line.split()
        if start_time and float(data[0]) < round(start_time * 10000) / 10000:
            continue
        if end_time and float(data[0]) > round(end_time * 10000) / 10000:
            continue
        timeaxis.append(float(data[0]))
        f0.append(float(data[1]))
    timeaxis = np.array(timeaxis)
    f0 = np.array(f0)

    results = {}

    ## start calculations

    ct_start = time.time()

    # this is the bottleneck of voxit calculations, but there's nothing we can do about it (?)
    sp = pyworld.cheaptrick(x.astype(np.float64), f0, timeaxis - start_time, fs)

    print(f'SYSTEM: Cheaptrick took {time.time() - ct_start:.2f}s')
    
    linPower = np.sum(np.divide(sp, np.max(sp)), axis=1)
    logPower = 10 * np.log10(linPower)

    # interpolate harvest pitch to sacc timeframe since sacc sampling rate is higher, but also filter to only work with voiced time regions (do not interpolate between voiced and non voiced regions)
    # if Dr. Miller is reading this, yes even though this part of the code looks different from the MATLAB version I checked the values/graphs of the resulting vuv and f0 arrays and they match up perfectly
    vuv = psacc != 0
    saccvuv = np.floor(np.interp(timeaxis, tsacc, vuv))
    saccf0 = np.interp(timeaxis, tsacc, psacc)
    saccf0[saccvuv != 1] = 0
    saccvuv = saccvuv.astype(bool)

    Imean = 10 ** np.mean(logPower[saccvuv] / 10)

    ts = timeaxis[1] - timeaxis[0]
    dminvoice = 0.100
    vdurthresh = round(dminvoice/ts)
    ixtmp = contiguous(saccvuv, np.array([1]))
    ixallvoicebounds = ixtmp[1]
    ixdiff = ixallvoicebounds[:,1] - ixallvoicebounds[:,0]
    ixvoicedbounds = ixallvoicebounds[ixdiff > vdurthresh,:]

    print(Imean)
    difflogI = 10 * np.log10(linPower / Imean)
    Ivelocity = []
    IsegmentMeans = []
    Iaccel = []

    for i in range(np.size(ixvoicedbounds, 0)):
        difflogItmp = difflogI[ixvoicedbounds[i, 0]:ixvoicedbounds[i, 1]]
        IsegmentMeans.append(np.mean(difflogItmp))
        Ivelocity.extend(np.diff(difflogItmp) / ts)
        Iaccel.extend(np.diff(np.diff(difflogItmp)) / ts)
        
    f0log = np.log2(saccf0, out=np.full_like(saccf0, np.NINF), where=saccf0 != 0)
    f0mean = 2 ** np.mean(f0log[saccvuv])
    diffoctf0 = f0log - np.log2(f0mean)
    (f0hist,_) = np.histogram(diffoctf0, bins=25, range=(-1,1))
    f0prob = f0hist / np.sum(f0hist)
    f0log2prob = np.log2(f0prob, out=np.full_like(f0prob, np.NINF), where=f0prob != 0)
    f0log2prob[f0prob == 0] = 0
    f0Entropy = -np.sum(f0prob * f0log2prob)

    f0velocity = []
    f0accel = []
    for i in range(np.size(ixvoicedbounds, 0)):
        diffocttmp = diffoctf0[ixvoicedbounds[i,0]:ixvoicedbounds[i,1]]
        diffocttmp = savgol_filter(diffocttmp, polyorder = 2, window_length = min(7, len(diffocttmp)))
        f0velocity.extend(np.diff(diffocttmp) / ts)
        f0accel.extend(np.diff(np.diff(diffocttmp)) / ts)

    f0MeanAbsVelocity = np.mean(np.abs(f0velocity))

    results["f0_Mean"] = f0mean
    results["f0_Entropy"] = f0Entropy
    results["f0_Range_95_Percent"] = 0 if len(diffoctf0[saccvuv]) == 0 else np.quantile(diffoctf0[saccvuv], .975) - np.quantile(diffoctf0[saccvuv], .025)
    results["f0_Mean_Abs_Velocity"] = f0MeanAbsVelocity
    results["f0_Mean_Abs_Accel"] = np.mean(np.abs(f0accel))

    SylMax = 0.400
    ixSylBounds = ixallvoicebounds[ixdiff < (SylMax / ts),:]
    for ii in range(np.size(ixSylBounds,0) - 1):
        if (ixSylBounds[ii+1, 0] - ixSylBounds[ii, 1]) > (SylMax / ts):
            shiftup = ixSylBounds[ii+1, 0] - ixSylBounds[ii, 1] - round(SylMax / ts)
            ixSylBounds[ii + 1:, :] = ixSylBounds[ii + 1:, :] - shiftup

    iSyl = []
    for jj in range(np.size(ixSylBounds, 0)):
        iSyl.extend(range(ixSylBounds[jj, 0], ixSylBounds[jj, 1] + 1))

    try:
        vuvSyl = np.zeros(np.max(iSyl) + 1)
        vuvSyl[iSyl] = 1
        ComplexitySyllables = 100 * lempel_ziv_complexity(vuvSyl)
    except:
        ComplexitySyllables = 0

    results["Complexity_Syllables"] = ComplexitySyllables

    ixPhraseBoundsTmp = ixallvoicebounds
    ixPhraseBounds = []
    iPhrase = []
    if np.size(ixPhraseBoundsTmp, 0) > 1:
        for kk in range(np.size(ixPhraseBoundsTmp, 0) - 1):
            if (ixPhraseBoundsTmp[kk+1, 0]-ixPhraseBoundsTmp[kk, 1]) < (SylMax / ts):
                ixPhraseBounds.append([ixPhraseBoundsTmp[kk, 0], ixPhraseBoundsTmp[kk+1, 1]])
            else:
                ixPhraseBounds.append([ixPhraseBoundsTmp[kk, 0], ixPhraseBoundsTmp[kk, 1]])

        ixPhraseBounds.append([ixPhraseBoundsTmp[kk+1, 0], ixPhraseBoundsTmp[kk+1, 1]])
    ixPhraseBounds = np.array(ixPhraseBounds)
    for ll in range(np.size(ixPhraseBounds, 0)):
        iPhrase.extend(range(ixPhraseBounds[ll, 0], ixPhraseBounds[ll, 1] + 1))

    vuvPhrase = np.zeros(len(saccvuv)) 
    vuvPhrase[iPhrase] = 1
    ComplexityPhrases = 100 * lempel_ziv_complexity(vuvPhrase)
    
    results["Complexity_Phrases"] = ComplexityPhrases

    dynamism = np.abs(f0MeanAbsVelocity) * f0Entropy + (ComplexitySyllables + ComplexityPhrases) / 2 * 0.439
    results["Dynamism"] = 0 if np.isnan(dynamism) else dynamism
    # results["Dynamism"] = (f0MeanAbsVelocity/.1167627388 + f0Entropy/.3331034878)/2 + ComplexityAllPauses/.6691896835

    results["Intensity_Mean_(decibels)"] = 10 ** np.mean(logPower[saccvuv] / 10)
    results["Intensity_Mean_Abs_Velocity_(decibels/sec)"] = 0 if len(Ivelocity) is 0 else np.mean(np.abs(Ivelocity))
    results["Intensity_Mean_Abs_Accel_(decibels/sec^2)"] = 0 if len(Ivelocity) is 0 else np.mean(np.abs(Iaccel))
    results["Intensity_Segment_Range_95_Percent_(decibels)"] = 0 if len(IsegmentMeans) is 0 else np.quantile(IsegmentMeans, .975) - np.quantile(IsegmentMeans, .025)

    # Output message
    print(f'SYSTEM: Finished calculating Voxit measurements (took {time.time() - entered:.2f}s)')

    return results

def contiguous(A, varargin):
    num = varargin
    runs = {}

    for numCount in range(len(num)):
        (indexVect,) = np.where(A == num[numCount])
        shiftVect = np.concatenate((indexVect[1:], indexVect[-1:]))
        diffVect = shiftVect - indexVect        
        (transitions,) = np.where(diffVect != 1)

        runEnd = indexVect[transitions]
        runStart = np.concatenate((indexVect[:1], indexVect[transitions[0:-1] + 1]))
        runs[num[numCount]] = np.stack((runStart, runEnd), axis=1)

    return runs

# pseudocode yoinked straight from https://en.wikipedia.org/wiki/Lempel-Ziv_complexity
# lz causing bottleneck, slap on a jit annotation
@jit
def lempel_ziv_complexity(S):
    i = 0
    C = 1
    u = 1
    v = 1
    n = len(S)
    vmax = v
    while u + v <= n:
        if S[i + v - 1] == S[u + v - 1]:
            v = v + 1
        else:
            vmax = max(v, vmax)
            i = i + 1
            if i == u:  # all the pointers have been treated
                C = C + 1
                u = u + vmax
                v = 1
                i = 0
                vmax = v
            else:
                v = 1
    if v != 1:
        C = C+1
    return C / ((len(S)) / np.log2(len(S)))