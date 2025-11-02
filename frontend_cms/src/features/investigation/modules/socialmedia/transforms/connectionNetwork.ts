/**
 * TASK 2.3.4: Connection Network Transform - Social graph mapper
 */

import { SocialConnection } from '../types';

export class ConnectionNetworkMapper {
  static buildNetwork(followers: SocialConnection[], following: SocialConnection[]): {
    mutualConnections: SocialConnection[];
    topFollowers: SocialConnection[];
    topFollowing: SocialConnection[];
    insights: string[];
  } {
    const followerMap = new Map(followers.map(f => [f.username, f]));
    const followingMap = new Map(following.map(f => [f.username, f]));

    // Find mutual connections
    const mutualConnections: SocialConnection[] = [];
    for (const [username, connection] of followerMap) {
      if (followingMap.has(username)) {
        mutualConnections.push({
          ...connection,
          relationshipType: 'mutual',
        });
      }
    }

    // Sort by interaction count
    const topFollowers = [...followers]
      .sort((a, b) => b.interactionCount - a.interactionCount)
      .slice(0, 20);

    const topFollowing = [...following]
      .sort((a, b) => b.interactionCount - a.interactionCount)
      .slice(0, 20);

    const insights: string[] = [
      `🤝 Mutual connections: ${mutualConnections.length}`,
      `👥 Total followers: ${followers.length}`,
      `➡️ Following: ${following.length}`,
    ];

    return {
      mutualConnections,
      topFollowers,
      topFollowing,
      insights,
    };
  }
}

