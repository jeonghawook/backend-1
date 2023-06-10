import { ReviewsRepository } from './../reviews/reviews.repository';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Stores } from './stores.entity';
import { CreateStoresDto } from './dto/create-stores.dto';
import { StoresSearchDto } from './dto/search-stores.dto';
import { StoresRepository } from './stores.repository';
// import axios from 'axios';
import { createReadStream } from 'fs';
import * as csvParser from 'csv-parser';

@Injectable()
export class StoresService {
  constructor(
    @InjectRepository(StoresRepository)
    private storesRepository: StoresRepository,
    private reviewsRepository: ReviewsRepository,
  ) {}

  async searchRestaurants(
    southWestLatitude: number,
    southWestLongitude: number,
    northEastLatitude: number,
    northEastLongitude: number,
    sortBy?: 'distance' | 'name' | 'waitingCnt' | 'waitingCnt2' | 'rating',
  ): Promise<{ 근처식당목록: Stores[] }> {
    const restaurants = await this.storesRepository.findAll();

    const restaurantsWithinRadius = restaurants.filter((restaurant) => {
      const withinLatitudeRange =
        Number(restaurant.La) >= southWestLatitude &&
        Number(restaurant.La) <= northEastLatitude;
      const withinLongitudeRange =
        Number(restaurant.Ma) >= southWestLongitude &&
        Number(restaurant.Ma) <= northEastLongitude;
      // console.log(withinLatitudeRange, withinLongitudeRange);
      return withinLatitudeRange && withinLongitudeRange;
    });

    // 거리 계산 로직
    const calculateDistance = (
      source: { latitude: number; longitude: number },
      target: { latitude: number; longitude: number },
    ): number => {
      const latDiff = Math.abs(source.latitude - target.latitude);
      const lngDiff = Math.abs(source.longitude - target.longitude);
      const approximateDistance = Math.floor(
        latDiff * 111000 + lngDiff * 111000,
      );
      return approximateDistance;
    };

    //user위치에 따른 거리값을 모든 sort조건에 포함시켜준다
    const userLocation = {
      latitude: southWestLatitude,
      longitude: southWestLongitude,
    };
    restaurantsWithinRadius.forEach((restaurant) => {
      const distance = calculateDistance(userLocation, {
        latitude: Number(restaurant.La),
        longitude: Number(restaurant.Ma),
      });
      restaurant.distance = distance;
    });

    //정렬로직모음
    restaurantsWithinRadius.sort((a, b) => {
      if (sortBy === 'distance') {
        return (a.distance || 0) - (b.distance || 0);
      } else if (sortBy === 'name') {
        const nameA = a.storeName.toUpperCase();
        const nameB = b.storeName.toUpperCase();
        if (nameA < nameB) {
          return -1;
        }
        if (nameA > nameB) {
          return 1;
        }
        return 0;
      } else if (sortBy === 'waitingCnt') {
        return a.currentWaitingCnt - b.currentWaitingCnt;
      } else if (sortBy === 'waitingCnt2') {
        return b.currentWaitingCnt - a.currentWaitingCnt;
      } else if (sortBy === 'rating') {
        return b.rating - a.rating;
      }
      return 0;
    });

    return { 근처식당목록: restaurantsWithinRadius };
  }

  //sorting //쿼리 searching 따로

  //키워드로 검색부분 //sorting 추가 //전국 식당으로 //가장 가까운 순으로?
  async searchStores(keyword: string): Promise<StoresSearchDto[]> {
    const searchStores = await this.storesRepository.searchStores(keyword);
    return searchStores;
  }

  //상세조회 + 댓글
  async getOneStore(storeId: number): Promise<Stores> {
    const store = await this.storesRepository.getOneStore(storeId);
    console.log(store);

    return store;
  }

  //임시
  async createStore(createUserDto: CreateStoresDto): Promise<Stores> {
    const store = await this.storesRepository.createStore(createUserDto);

    return store;
  }

  //CSV 부분
  async processCSVFile(inputFile: string): Promise<void> {
    const batchSize = 100;

    return new Promise<void>((resolve, reject) => {
      let currentBatch: any[] = [];
      createReadStream(inputFile, { encoding: 'utf-8' })
        .pipe(csvParser())
        .on('error', (error) => {
          console.error('Error reading CSV file:', error);
          reject(error);
        })
        .on('data', async (row: any) => {
          if (row['상세영업상태코드'] === '01') {
            currentBatch.push(row);

            if (currentBatch.length === batchSize) {
              await this.storesRepository.processCSVFile(currentBatch);
              currentBatch = [];
            }
          }
        })
        .on('end', async () => {
          if (currentBatch.length > 0) {
            await this.storesRepository.processCSVFile(currentBatch);
          }
          resolve();
        })
        .on('finish', () => {
          console.log('CSV processing completed.');
        });
    });
  }
  //카카오 좌표 부분
  async updateCoordinates(): Promise<void> {
    try {
      const stores = await this.storesRepository.getStoreAddressId();

      for (const store of stores) {
        const { address, oldAddress, storeId } = store;

        try {
          let coordinates = await this.storesRepository.getCoordinate(address);

          if (!coordinates) {
            coordinates = await this.storesRepository.getCoordinate(oldAddress);
          }
          if (!coordinates) continue;

          const La = coordinates[0];
          const Ma = coordinates[1];

          await this.storesRepository.updateCoord(La, Ma, storeId);

          console.log(
            `Updated coordinates for address: ${address}`,
            La,
            Ma,
            storeId,
          );
        } catch (error) {
          console.error(
            `Error updating coordinates for address: ${address} and ${oldAddress}`,
            error,
          );
        }
      }
    } catch (error) {
      console.error('Error occurred during database operation:', error);
    }
  }

  async updateRating(storeId: number): Promise<void> {
    const averageRating = await this.reviewsRepository.getAverageRating(
      storeId,
    );
    return this.storesRepository.updateRating(storeId, averageRating);
  }
}

// private readonly API_KEY = 'e84edcba09907dc19727de566a994a88';

// async searchPlaces(
//   query: string,
//   userLocation: { latitude: number; longitude: number },
// ): Promise<any> {
//   const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${query}&y=${userLocation.latitude}&x=${userLocation.longitude}&radius=3000`;
//   const response = await axios.get(url, {
//     headers: {
//       Authorization: 'KakaoAK ' + this.API_KEY,
//     },
//   });

//   const filteredResults = response.data.documents
//     .filter((place: any) => place.category_group_name === '음식점')
//     .map((place: any) => {
//       const {
//         id,
//         category_group_name,
//         place_name,
//         phone,
//         address_name,
//         road_address_name,
//         distance,
//         place_url,
//         x,
//         y,
//       } = place;
//       return {
//         storeId: id,
//         category_name: category_group_name,
//         place_name,
//         phone,
//         address_name,
//         road_address_name,
//         distance: `${distance}m`,
//         place_url,
//         x,
//         y,
//       };
//     })
//     .sort((a: any, b: any) => {
//       const distanceA = parseInt(a.distance.replace('m', ''));
//       const distanceB = parseInt(b.distance.replace('m', ''));
//       return distanceA - distanceB;
//     });

//   return filteredResults;
// }
