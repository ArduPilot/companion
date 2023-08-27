import numpy as np
import cv2 as cv
from matplotlib import pyplot as plt
import pyexiv2, json
import math
from base_structures import location

baseImg = "t2.jpeg"
testImg = "t1.jpeg"

class Image_Process:
    def __init__(self):
        self.x_offset = 0
        self.y_offset = 0

        self.MIN_MATCH_COUNT = 30

        self.LOCATION_SCALING_FACTOR_INV = 89.83204953368922 
        self.LOCATION_SCALING_FACTOR = 0.011131884502145034 

        self.inCMX = 0
        self.inCMY = 0

        #user input ______________
        self.focal = 476.7030836014194
        self.latBase = -353632621
        self.lonbase = 1491652371

        self.lat = -35.363261
        self.lon = 149.165230
        self.alt = 584

        self.loc2 = location


    def readExif(self, image):
        with open(image, 'rb') as f:
            with pyexiv2.ImageData(f.read()) as img:
                data = img.read_exif()
                print(data['Exif.Photo.UserComment'])
        f.close()

    def modifyExif(self, image,data=None):
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

    def calc_dist(self,x1, y1, x2, y2):
        distance = math.sqrt((x2 - x1)**2 + (y2 - y1)**2)
        return distance


    def compParam(self,img1,img2):

        print('comparing ' + img1 + ' vs ' + img2 + "\n")

        img1 = cv.imread(img1,0)
        img2 = cv.imread(img2,0)
        #img2 = cv.resize(img2, (1778,866))

        # extract key features from each image
        sift = cv.SIFT_create(nfeatures = 10000)
        kp1, des1 = sift.detectAndCompute(img1,None)
        kp2, des2 = sift.detectAndCompute(img2,None)

        # find matching features from each image
        FLANN_INDEX_KDTREE = 1
        index_params = dict(algorithm = FLANN_INDEX_KDTREE, trees = 5)
        search_params = dict(checks = 50)
        flann = cv.FlannBasedMatcher(index_params, search_params)
        matches = flann.knnMatch(des1,des2,k=2)

        # create array of best matches
        good = []
        for m,n in matches:
            if m.distance < 0.7*n.distance:
                good.append(m)


        # ensure we have at at least 30 matching points
        if len(good)>self.MIN_MATCH_COUNT:

            print(len(good))

            # display image showing matching points
            src_pts = np.float32([kp1[m.queryIdx].pt for m in good]).reshape(-1,1,2)
            dst_pts = np.float32([kp2[m.trainIdx].pt for m in good]).reshape(-1,1,2)
            M, mask = cv.findHomography(src_pts, dst_pts, cv.RANSAC,5.0)
            matchesMask = mask.ravel().tolist()
            h,w = img1.shape
            pts = np.float32([ [0,0],[0,h-1],[w-1,h-1],[w-1,0] ]).reshape(-1,1,2)
            dst = cv.perspectiveTransform(pts,M)
            img2 = cv.polylines(img2,[np.int32(dst)],True,255,3, cv.LINE_AA)

            # warped_img2 = cv.warpPerspective(img2, M, (w, h))


            # calculate rotation difference
            diff = np.abs(dst - pts)
            #zoom_diff = (np.abs(np.linalg.norm(diff[0][0]) - np.linalg.norm(diff[2][0])) / np.linalg.norm(diff[0][0])) * 100
            #print("Zoom difference: {:.2f}".format(zoom_diff))
            # zoom_diff = np.abs(np.linalg.norm(diff[0][0]) - np.linalg.norm(diff[2][0]))
            # print("Zoom difference: {:.2f} pixels".format(zoom_diff))
            orientation_diff = np.arctan2(np.abs(dst[1][0][1] - dst[0][0][1]), np.abs(dst[1][0][0] - dst[0][0][0]))
            

            print("Orientation difference: {:.2f} degrees".format(90 - np.degrees(orientation_diff)))


            # calculate x, y offset
            h1, w1 = img1.shape[:2]
            h, w = img2.shape

            Mr, maskr = cv.findHomography(dst_pts, src_pts, cv.RANSAC, 5.0)

            corners = np.array([[0, 0], [0, h-1], [w-1, h-1], [w-1, 0]], dtype=np.float32).reshape(-1, 1, 2)
            transformed_corners = cv.perspectiveTransform(corners, Mr)

            x, y = np.mean(transformed_corners, axis=0).astype(int)[0]

            print("Offset x, y(in cms): ",x-w1/2, y-h1/2)

            self.inCMX = (x-w1/2) * (10) / self.focal
            self.inCMY = (y-h1/2) * (10) / self.focal


            # calculate zoom percentage
            binToBool= [True if n == 1 else False for n in matchesMask]
            res = list(filter(lambda i: binToBool[i], range(len(binToBool))))
            res_listQ = [src_pts[i].tolist() for i in res]
            res_listT = [dst_pts[i].tolist() for i in res]

            mainDist = self.calc_dist(res_listQ[0][0][0],res_listQ[0][0][1],res_listQ[-1][0][0],res_listQ[-1][0][1])
            desDist = self.calc_dist(res_listT[0][0][0],res_listT[0][0][1],res_listT[-1][0][0],res_listT[-1][0][1])

            scaleRatio = mainDist/desDist
            print("Scaling Ratio:",scaleRatio) # multiplied by base altitude generates current altitude

        else:
            print("Not enough matches are found - {}/{}".format(len(good), self.MIN_MATCH_COUNT) )
            matchesMask = None


        draw_params = dict(matchColor = (0,255,0),
                           singlePointColor = (255,0,0),
                           matchesMask = matchesMask,
                           flags = 2)





        cv.namedWindow("img3", cv.WINDOW_NORMAL)
        img3 = cv.drawMatches(img1,kp1,img2,kp2,good,None,**draw_params)
        #img3 = cvresize(img3, (1500,1000))
        #print(comm)
        cv.imshow('img3', img3)
        # cv.imshow('img3', img3)

        # calculate new lat and lng based upon pixel offset
        # To-Do: get lat,lon,alt from image1 or user
       # self.offset_latlng(self.latBase,self.lonbase,-self.inCMX,self.inCMY)

        print("Waiting for key press")
        cv.waitKey(0)



    def offset_latlng(self,lat,lng,ofs_north,ofs_east):
        dlat = ofs_north * self.LOCATION_SCALING_FACTOR_INV
        dlng = (ofs_east * self.LOCATION_SCALING_FACTOR_INV) / self.longitude_scale(lat+dlat/2)
        lat += dlat
        lat = self.limit_lattitude(lat)
        lng = self.wrap_longitude(dlng+lng)
        print("Updated Lat:",lat,"\n","Updated Lon:",lng)


    def longitude_scale(self,lat):
        scale = math.cos(lat * (1.0e-7 * (math.pi/180)))
        return max(scale, 0.01)


    def limit_lattitude(self,lat):
        if lat > 900000000:
            lat = 1800000000 - lat
        elif lat < -900000000:
            lat = -(1800000000 + lat)
        return lat


    def wrap_longitude(self,lon):
        if lon > 1800000000:
            lon = int(lon-3600000000)
        elif lon < -1800000000:
            lon = int(lon+3600000000)
        return int(lon)



    def longitude_scale(lat):
        scale = math.cos(lat * (1.0e-7 * (math.pi/180)))
        return max(scale, 0.01)

    def diff_longitude(lon1, lon2):
        if (lon1 & 0x80000000) == (lon2 & 0x80000000):
            return lon1 - lon2
        dlon = int(lon1) - int(lon2)
        if dlon > 1800000000:
            dlon -= 3600000000
        elif dlon < -1800000000:
            dlon += 3600000000
        return int(dlon)



    def get_dist_ned(self, loc):
        return (self.loc2.lat - self.lat) * (self.LOCATION_SCALING_FACTOR), diff_longitude(self.loc2.lon, self.lon) * self.LOCATION_SCALING_FACTOR * longitude_scale((self.lat + self.loc2.lat) / 2), (self.alt - self.loc2.alt) * 0.01

if __name__ == '__main__':

    img = Image_Process()

    img.compParam(baseImg, testImg)
