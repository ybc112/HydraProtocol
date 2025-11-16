/**
 * Hook for fetching marketplace data from Sui blockchain
 */

'use client';

import { useState, useEffect } from 'react';
import { SuiClient } from '@mysten/sui/client';
import { getHydraConfig } from '../config/hydra';

export interface MarketplaceDataset {
  id: string;
  title: string;
  category: string;
  description: string;
  price: string;
  priceInSui: number;
  provider: string;
  verified: boolean;
  stats: {
    records: string;
    queries: string;
    rating: number;
  };
  dataRecordId?: string;
  walrusBlobId?: string;
  dataType?: string;
  isPublic?: boolean;
  fileName?: string;
  fileType?: string;
  fileExtension?: string;
}

export interface UseMarketplaceDataReturn {
  datasets: MarketplaceDataset[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook to fetch marketplace listings from Sui blockchain
 */
export function useMarketplaceData(): UseMarketplaceDataReturn {
  const [datasets, setDatasets] = useState<MarketplaceDataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMarketplaceData = async () => {
    try {
      setLoading(true);
      setError(null);

      const config = getHydraConfig();
      const client = new SuiClient({
        url: config.sui?.network === 'testnet'
          ? 'https://fullnode.testnet.sui.io:443'
          : 'https://fullnode.mainnet.sui.io:443'
      });

      const packageId = config.sui?.packageId;

      if (!packageId) {
        throw new Error('Package ID not configured');
      }

      // Query all DataListing objects by filtering objects of the DataListing type
      // DataListing type: {packageId}::market::DataListing
      const dataListingType = `${packageId}::market::DataListing`;

      console.log('Querying DataListing objects with type:', dataListingType);

      // DataListing objects are shared objects, so we query all objects of this type
      // Use queryEvents to find DataListed events, then fetch the listing objects
      const events = await client.queryEvents({
        query: {
          MoveEventType: `${packageId}::market::DataListed`
        },
        limit: 50,
        order: 'descending'
      });

      console.log('Found', events.data.length, 'DataListed events');

      // Extract listing IDs from events
      const listingIds = events.data.map(event => {
        const parsedJson = event.parsedJson as any;
        return parsedJson?.listing_id;
      }).filter(id => id);

      if (listingIds.length === 0) {
        // No listings found, show mock data with instructions
        console.warn('No marketplace listings found on-chain. Using mock data for demonstration.');
        console.log('To create real listings, run: npm run demo:create-listing');
        setDatasets(getMockDatasets());
      } else {
        // Fetch each listing object
        const parsedDatasets = (await Promise.all(
          listingIds.map(async (listingId) => {
            try {
              const listingObject = await client.getObject({
                id: listingId,
                options: { showContent: true, showType: true }
              });

              const content = listingObject.data?.content;
              if (!content || !('fields' in content)) {
                return null;
              }

              const fields = content.fields as any;

              // Try to fetch DataRecord to get metadata with fileName and fileType
              let fileName: string | undefined;
              let fileType: string | undefined;
              let fileExtension: string | undefined;
              let dataTitle = fields.description || 'Untitled Dataset';

              if (fields.data_record_id) {
                try {
                  const dataRecord = await client.getObject({
                    id: fields.data_record_id,
                    options: { showContent: true }
                  });

                  const recordContent = dataRecord.data?.content;
                  if (recordContent && 'fields' in recordContent) {
                    const recordFields = recordContent.fields as any;
                    const metadata = recordFields.description || '';

                    // Try to parse metadata JSON
                    try {
                      const metadataObj = JSON.parse(metadata);
                      fileName = metadataObj.fileName;
                      fileType = metadataObj.fileType;

                      if (fileName && fileName.includes('.')) {
                        fileExtension = fileName.substring(fileName.lastIndexOf('.'));
                      }

                      // Use fileName as title if available
                      if (fileName) {
                        dataTitle = fileName;
                      }
                    } catch (e) {
                      // Not JSON, that's okay
                    }
                  }
                } catch (err) {
                  console.log('Could not fetch DataRecord for listing:', listingId);
                }
              }

              // 计算真实评分：基于销量和活跃度
              const totalSales = fields.total_sales || 0;
              const isActive = fields.active || false;
              
              // 评分算法：新数据默认0分，有销量后根据销量计算
              let rating = 0;
              if (totalSales > 0) {
                // 基础评分3.0，每次销售增加0.15分，最高5.0
                rating = Math.min(3.0 + (totalSales * 0.15), 5.0);
                // 不活跃的数据扣0.5分
                if (!isActive) {
                  rating = Math.max(rating - 0.5, 0);
                }
                // 保留1位小数
                rating = Math.round(rating * 10) / 10;
              }

              return {
                id: listingId,
                title: dataTitle,
                category: fields.data_type || 'General',
                description: fields.description || '',
                price: `${(fields.price || 0) / 1e9} SUI`,
                priceInSui: (fields.price || 0) / 1e9,
                provider: fields.owner || '',
                verified: fields.active || false,
                stats: {
                  records: fields.total_sales?.toString() || '0',
                  queries: fields.total_sales?.toString() || '0',
                  rating: rating // 真实计算的评分
                },
                dataRecordId: fields.data_record_id,
                walrusBlobId: fields.walrus_blob_id,
                dataType: fields.data_type,
                isPublic: fields.active,
                fileName,
                fileType,
                fileExtension
              } as MarketplaceDataset;
            } catch (err) {
              console.error('Error fetching listing:', listingId, err);
              return null;
            }
          })
        )).filter((d): d is MarketplaceDataset => d !== null);

        setDatasets(parsedDatasets);
      }

    } catch (err) {
      console.error('Error fetching marketplace data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch marketplace data');

      // Fallback to mock data on error
      console.log('Using mock data due to error. To see real data, ensure contracts are deployed and listings exist.');
      setDatasets(getMockDatasets());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarketplaceData();
  }, []);

  return {
    datasets,
    loading,
    error,
    refetch: fetchMarketplaceData
  };
}

/**
 * Mock datasets for development and fallback
 * TODO: Remove when real data is available
 */
function getMockDatasets(): MarketplaceDataset[] {
  // Mock数据使用真实评分算法：基于queries (模拟销量)
  const calculateMockRating = (queries: number) => {
    if (queries === 0) return 0;
    const rating = Math.min(3.0 + (queries * 0.015), 5.0);
    return Math.round(rating * 10) / 10;
  };

  return [
    {
      id: '1',
      title: 'Hospital Patient Recovery Data',
      category: 'Healthcare',
      description: 'Anonymized recovery time data from 1000+ patients across multiple hospitals. Perfect for medical research and ML training.',
      price: '100 SUI',
      priceInSui: 100,
      provider: '0x1234...5678',
      verified: true,
      stats: {
        records: '1,234',
        queries: '156',
        rating: calculateMockRating(156) // 基于查询次数计算
      }
    },
    {
      id: '2',
      title: 'Clinical Trial Results Dataset',
      category: 'Healthcare',
      description: 'Phase 3 clinical trial outcomes with demographic data. All PII removed and encrypted.',
      price: '250 SUI',
      priceInSui: 250,
      provider: '0xabcd...ef01',
      verified: true,
      stats: {
        records: '5,678',
        queries: '89',
        rating: calculateMockRating(89)
      }
    },
    {
      id: '3',
      title: 'DeFi Transaction Patterns',
      category: 'Finance',
      description: 'Analysis-ready DeFi transaction data from Sui blockchain. Includes wallet behavior and swap patterns.',
      price: '75 SUI',
      priceInSui: 75,
      provider: '0x9876...5432',
      verified: false,
      stats: {
        records: '10,234',
        queries: '234',
        rating: calculateMockRating(234)
      }
    },
    {
      id: '4',
      title: 'Supply Chain Logistics Data',
      category: 'Logistics',
      description: 'Real-world supply chain data with delivery times, costs, and route optimization insights.',
      price: '150 SUI',
      priceInSui: 150,
      provider: '0x2468...1357',
      verified: true,
      stats: {
        records: '3,456',
        queries: '67',
        rating: calculateMockRating(67)
      }
    }
  ];
}
