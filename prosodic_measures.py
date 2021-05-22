import csv
import math
import decimal
import numpy
import sys
import os
import argparse

# from lempel_ziv_complexity import lempel_ziv_complexity
from numba import jit
from scipy.signal import savgol_filter

def measure(gentlecsv, driftcsv, start_time, end_time):

    csv.field_size_limit(sys.maxsize)

    results = {}

    # GENTLE
    gentle_start = []
    gentle_end = []
    gentle_wordcount = 0
    gentle_length = 0
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
            continue
        # Ignore noise
        if measures[0] != '[noise]':
            gentle_wordcount += 1
            if not (measures[1] or measures[2] or measures[3]): # ignore rows with empty cells
                continue
            gentle_start.append(round(float(measures[2]) * 10000)/10000)
            gentle_end.append(round(float(measures[3]) * 10000)/10000)
            gentle_length = float(measures[3]) * 10000/10000 # save the last length

    # Speaking rate calculated as words per minute, or WPM.
    # Divided by the length of the recording and normalized if the recording was longer
    # or shorter than one minute to reflect the speaking rate for 60 seconds.
    WPM = math.floor(gentle_wordcount / (gentle_length / 60))
    results["WPM"] = WPM

    # Pause counts and average pause length.
    # We do not consider pauses less than 100 ms because fully continuous speech also naturally has such brief gaps in energy,
    # nor do we consider pauses that exceed 3,000 ms (that is, 3 seconds), because they are quite rare.
    sum = 0
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

    # while start_pause < max_pause:
    #     tmp_pause_count = 0
    #     for x in range(0, len(gentle_end) - 1):
    #         tmp = gentle_start[x + 1] - gentle_end[x]
    #         if tmp >= start_pause and tmp <= max_pause:
    #             tmp_pause_count += 1
    #     temp_output.append(tmp_pause_count)
    #     start_pause += 0.5

    results["Gentle_Long_Pause_Count_>3000ms"] = long_pause_count

    if pause_count == 0:
        APL = 0
    else:
        APL = decimal.Decimal(sum / pause_count)
    results["Gentle_Mean_Pause_Duration"] = float(round(APL, 2))

    # Average pause rate per second.
    pause_count = 0
    for x in range(0, len(gentle_end) - 1):
        tmp = gentle_start[x + 1] - gentle_end[x]
        if tmp >= 0.1 and tmp <= 3:
            pause_count += 1

    APR = decimal.Decimal(pause_count / gentle_length)
    results["Gentle_Pause_Rate"] = float(round(APR, 3))

    # Rhythmic Complexity of Pauses
    s = []
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
    CP = lempel_ziv_complexity("".join([str(i) for i in s])) / ((len(s) - 1) / math.log2(len(s) - 1))
    results["Gentle_Complexity_All_Pauses"] = CP * 100

    # Output message
    print('SYSTEM: Finished calculating file')

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
    drift = csv.reader(driftcsv, delimiter=' ')
    i = 1
    for row in drift:
        # Save measurements as list elements
        measures = row[0].split(',')
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
            end = temp
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
    f0mean = math.pow(2, (f0mean / len(f0log)))
    results["Drift_f0_Mean"] = f0mean

    # Calculate diffoctf0
    # diffoctf0 = log2(S.SAcC.f0)-log2(f0mean);
    diffoctf0 = []
    for p in drift_pitch: # S.SAcC.f0
        diffoctf0.append(math.log2(p) - math.log2(f0mean))

    # Calculate f0hist
    # f0hist = histcounts(diffoctf0,25,'BinLimits',[-1 +1]); % 1/12 octave bins
    f0hist, bin_edges = numpy.histogram(diffoctf0, 25, (-1, 1))

    # Calculate f0prob (probability distribution)
    # f0prob = f0hist./sum(f0hist);
    f0prob = []
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
    PR = max(diffoctf0) - min(diffoctf0)
    # print('7. Pitch range:', PR, 'octaves')
    results["Drift_f0_Range"] = PR

    # Pitch speed and acceleration pre-calculations

    # ixtmp = contiguous(S.SAcC.vuv,1);
    # https://www.mathworks.com/matlabcentral/fileexchange/5658-contiguous-start-and-stop-indices-for-contiguous-runs

    # vdurthresh = round(dminvoice/ts);
    # ts = S.refinedF0Structure.temporalPositions(2)-S.refinedF0Structure.temporalPositions(1);
    dminvoice = .100
    ts = drift_time[1] - drift_time[0]
    vdurthresh = decimal.Decimal(dminvoice / ts)
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
        diffocttmp = savgol_filter(diffocttmp, polyorder = 2, window_length = 7)
        # f0velocity = [f0velocity; diff(diffocttmp)/ts];
        # f0accel = [f0accel; diff(diff(diffocttmp))/ts];
        for d in numpy.diff(diffocttmp):
            f0velocity.append(d/ts)
        for d in numpy.diff(diffocttmp, n = 2):
            f0accel_d2.append(d/ts) # double diff

    # S.analysis.f0speed = mean(abs(f0velocity)) * sign(mean(f0velocity));
    sum =  0
    for v in f0velocity:
        sum += abs(v)
    f0velocity_mean = sum / len(f0velocity)

    PS = f0velocity_mean
    results["Drift_f0_Mean_Abs_Velocity"] = PS

    # S.analysis.f0contour = mean(abs(f0accel)) * sign(mean(f0accel)); %signed directionless acceleration
    sum =  0
    for v in f0accel_d2:
        sum += abs(v)
    f0accel_mean = sum / len(f0accel_d2)

    PA = f0accel_mean
    results["Drift_f0_Mean_Abs_Accel"] = PA

    # Pitch Entropy, or entropy for f0, indicating the predictability of pitch patterns
    # f0entropy = -sum(f0prob.*f0log2prob);
    f0entropy = 0
    for i in range(0, len(f0prob)):
        f0entropy += f0prob[i] * f0log2prob[i]
    PE = -f0entropy
    results["Drift_f0_Entropy"] = PE

    results["Dynamism"] = (f0velocity_mean/0.1167627388 + PE/0.3331034878)/2 + CP * 100/0.6691896835
    
    return results

# https://en.wikipedia.org/wiki/Lempel-Ziv_complexity
# TODO: optimize, probably by porting from matlab code. For now, just use wikipedia pseudocode
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
    return C