import numpy as np
import cv2 as cv
from matplotlib import pyplot as plt
import subprocess
import pyexiv2, json
import math

x_offset = 0
y_offset = 0

MIN_MATCH_COUNT = 30

LOCATION_SCALING_FACTOR_INV = 89.83204953368922

inCMX = 0
inCMY = 0

focal = 476.7030836014194



def readExif(image):
    with open(image, 'rb') as f:
        with pyexiv2.ImageData(f.read()) as img:
            data = img.read_exif()
            print(data['Exif.Photo.UserComment'])
    f.close()

def modifyExif(image,data=None):
    with open(image, 'rb+') as f:
        with pyexiv2.ImageData(f.read()) as img:
            matadata = data
            dict1 = {'Exif.Photo.UserComment': json.dumps(metadata)}
            img.modify_exif(dict1)
            
            f.seek(0)
            f.truncate()
            f.write(img.get_bytes())
        f.seek(0)
        with pyexiv2.ImageData(f.read()) as img:
            result = img.read_exif()
            #print(result)
    f.close()


def compParam(img1,img2):
    global inCMY, inCMX
    global x_offset, y_offset
    img1 = cv.imread(img1,0)
    img2 = cv.imread(img2,0)
    #img2 = cv.resize(img2, (1778,866))
    sift = cv.SIFT_create(nfeatures = 10000)

    kp1, des1 = sift.detectAndCompute(img1,None)
    kp2, des2 = sift.detectAndCompute(img2,None)
    FLANN_INDEX_KDTREE = 1
    index_params = dict(algorithm = FLANN_INDEX_KDTREE, trees = 5)
    search_params = dict(checks = 50)
    flann = cv.FlannBasedMatcher(index_params, search_params)
    matches = flann.knnMatch(des1,des2,k=2)

    good = []
    for m,n in matches:
        if m.distance < 0.7*n.distance:
            good.append(m)


    if len(good)>MIN_MATCH_COUNT:
        src_pts = np.float32([ kp1[m.queryIdx].pt for m in good ]).reshape(-1,1,2)
        dst_pts = np.float32([ kp2[m.trainIdx].pt for m in good ]).reshape(-1,1,2)
        M, mask = cv.findHomography(src_pts, dst_pts, cv.RANSAC,5.0)
        matchesMask = mask.ravel().tolist()
        h,w = img1.shape
        pts = np.float32([ [0,0],[0,h-1],[w-1,h-1],[w-1,0] ]).reshape(-1,1,2)
        dst = cv.perspectiveTransform(pts,M)
        img2 = cv.polylines(img2,[np.int32(dst)],True,255,3, cv.LINE_AA)



        #Orientation

        diff = np.abs(dst - pts)
        orientation_diff = np.arctan2(np.abs(dst[1][0][1] - dst[0][0][1]), np.abs(dst[1][0][0] - dst[0][0][0]))
        print("Orientation difference: {:.2f} degrees".format(90 - np.degrees(orientation_diff)))


        #x, y offset

        h1, w1 = img1.shape[:2]
        h, w = img2.shape

        sr_pts = np.float32([kp1[m.queryIdx].pt for m in good]).reshape(-1, 1, 2)
        ds_pts = np.float32([kp2[m.trainIdx].pt for m in good]).reshape(-1, 1, 2)
        Mr, maskr = cv.findHomography(ds_pts, sr_pts, cv.RANSAC, 5.0)

        corners = np.array([[0, 0], [0, h-1], [w-1, h-1], [w-1, 0]], dtype=np.float32).reshape(-1, 1, 2)
        transformed_corners = cv.perspectiveTransform(corners, Mr)

        x, y = np.mean(transformed_corners, axis=0).astype(int)[0]

        print("Offset x, y: ",x-w1/2, y-h1/2)

        inCMX = (x-w1/2) * (10) / focal
        inCMY = (y-h1/2) * (10) / focal


        #Zoom percentage -- Not complete

        width = abs(transformed_corners[2][0][0]) - abs(transformed_corners[0][0][0])
        height = abs(transformed_corners[2][0][1]) - abs(transformed_corners[0][0][1])

        im2 = width * height
        im1 = img1.shape[0] * img1.shape[1]

        #print(transformed_corners)

        print(f"Zoom percent: {im2/im1*100} %")

    else:
        print( "Not enough matches are found - {}/{}".format(len(good), MIN_MATCH_COUNT) )
        matchesMask = None


    draw_params = dict(matchColor = (0,255,0),
                       singlePointColor = (255,0,0),
                       matchesMask = matchesMask,
                       flags = 2)


    binToBool= [True if n == 1 else False for n in matchesMask]
    res = list(filter(lambda i: binToBool[i], range(len(binToBool))))
    res_listQ = [src_pts[i].tolist() for i in res]
    res_listT = [dst_pts[i].tolist() for i in res]


    cv.namedWindow("img3", cv.WINDOW_NORMAL)
    img3 = cv.drawMatches(img1,kp1,img2,kp2,good,None,**draw_params)

    cv.imshow('img3', img3)

    cv.waitKey(0)



def offset_latlng(lat,lng,ofs_north,ofs_east):
    dlat = ofs_north * LOCATION_SCALING_FACTOR_INV
    dlng = (ofs_east * LOCATION_SCALING_FACTOR_INV) / longitude_scale(lat+dlat/2)
    lat += dlat
    lat = limit_lattitude(lat)
    lng = wrap_longitude(dlng+lng)
    print("New Lat & Lng: ",lat,lng)


def longitude_scale(lat):
    scale = math.cos(lat * (1.0e-7 * (math.pi/180)))
    return max(scale, 0.01)


def limit_lattitude(lat):
    if lat > 900000000:
        lat = 1800000000 - lat
    elif lat < -900000000:
        lat = -(1800000000 + lat)
    return lat


def wrap_longitude(lon):
    if lon > 1800000000:
        lon = int(lon-3600000000)
    elif lon < -1800000000:
        lon = int(lon+3600000000)
    return int(lon)
    
    
if __name__ == '__main__':

    compParam("test1.png",'test2.png') #To find the features and get orientation, offset and zoom

    offset_latlng(-353632621,1491652378,-inCMX,inCMY) #Extract new lat and lng based upon pixel offset

