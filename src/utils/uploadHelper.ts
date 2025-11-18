import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFetchBlob from 'rn-fetch-blob';
const API_BASE_URL = 'https://sharplook-be.onrender.com/api/v1';
interface UploadServiceData {
  name: string;
  description: string;
  category: string;
  basePrice: number;
  priceType: 'fixed' | 'variable';
  currency: string;
  duration: number;
  serviceArea: {
    type: string;
    coordinates: number[];
    radius: number;
  };
}
export const uploadService = async (serviceData: UploadServiceData, images?: any[]): Promise<any> => {
  try {
    const token = await AsyncStorage.getItem('accessToken');
    const formData: any[] = [{
      name: 'name',
      data: serviceData.name
    }, {
      name: 'description',
      data: serviceData.description
    }, {
      name: 'category',
      data: serviceData.category
    }, {
      name: 'basePrice',
      data: String(serviceData.basePrice)
    }, {
      name: 'priceType',
      data: serviceData.priceType
    }, {
      name: 'currency',
      data: serviceData.currency
    }, {
      name: 'duration',
      data: String(serviceData.duration)
    }, {
      name: 'serviceArea',
      data: JSON.stringify(serviceData.serviceArea)
    }];
    if (images && images.length > 0) {
      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        if (image.uri && !image.uri.startsWith('http')) {
          const uri = image.uri.replace('file://', '');
          formData.push({
            name: 'images',
            filename: image.name || `service_image_${i}.jpg`,
            type: image.type || 'image/jpeg',
            data: RNFetchBlob.wrap(uri)
          });
        }
      }
    }
    console.log('📤 Uploading service with', images?.length || 0, 'images');
    const response = await RNFetchBlob.fetch('POST', `${API_BASE_URL}/services`, {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'multipart/form-data'
    }, formData);
    const jsonResponse = response.json();
    console.log('✅ Service created:', jsonResponse);
    return {
      success: jsonResponse.success,
      data: jsonResponse.data,
      message: jsonResponse.message
    };
  } catch (error) {
    console.error('❌ Upload service error:', error);
    throw error;
  }
};
export const updateServiceWithImages = async (serviceId: string, serviceData: any, images?: any[]): Promise<any> => {
  try {
    const token = await AsyncStorage.getItem('accessToken');
    const formData: any[] = [];
    Object.keys(serviceData).forEach(key => {
      const value = serviceData[key];
      if (key === 'serviceArea' && typeof value === 'object') {
        formData.push({
          name: key,
          data: JSON.stringify(value)
        });
      } else if (key === 'images') {
        const existingImageUrls = value.filter((img: any) => typeof img === 'string' && img.startsWith('http'));
        if (existingImageUrls.length > 0) {
          formData.push({
            name: 'existingImages',
            data: JSON.stringify(existingImageUrls)
          });
        }
      } else if (value !== undefined && value !== null) {
        formData.push({
          name: key,
          data: String(value)
        });
      }
    });
    if (images && images.length > 0) {
      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        if (image.uri && !image.uri.startsWith('http')) {
          const uri = image.uri.replace('file://', '');
          formData.push({
            name: 'images',
            filename: image.name || `service_image_${i}.jpg`,
            type: image.type || 'image/jpeg',
            data: RNFetchBlob.wrap(uri)
          });
        }
      }
    }
    console.log('📤 Updating service with', images?.length || 0, 'images');
    const response = await RNFetchBlob.fetch('PUT', `${API_BASE_URL}/services/${serviceId}`, {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'multipart/form-data'
    }, formData);
    const jsonResponse = response.json();
    console.log('✅ Service updated:', jsonResponse);
    return {
      success: jsonResponse.success,
      data: jsonResponse.data,
      message: jsonResponse.message
    };
  } catch (error) {
    console.error('❌ Update service error:', error);
    throw error;
  }
};