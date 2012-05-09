//
//  WiiRemoteDiscovery.h
//  DarwiinRemote
//
//  Created by Ian Rickard on 12/9/06.
//  Modified for WiiFlight by Hiromu Yakura on 09/05/12.
//  Copyright 2006 Ian Rickard. All rights reserved.
//

#import <Cocoa/Cocoa.h>
#import <IOBluetooth/IOBluetooth.h>

#import "WiiRemote.h"

@protocol WiiRemoteDiscoveryDelegate;

@interface WiiRemoteDiscovery : NSObject {
	IOBluetoothDeviceInquiry * _inquiry;
	BOOL _isDiscovering;
	
	id<WiiRemoteDiscoveryDelegate> _delegate;
}

+ (WiiRemoteDiscovery*) discoveryWithDelegate:(id<WiiRemoteDiscoveryDelegate>)delegate;

- (id) delegate;
- (void) setDelegate:(id<WiiRemoteDiscoveryDelegate>) delegate;

- (IOReturn) start;
- (IOReturn) stop;
- (IOReturn) close;

- (BOOL) isDiscovering;
- (void) setIsDiscovering:(BOOL) flag;

- (void) connectToFoundDevices;

@end


@protocol WiiRemoteDiscoveryDelegate<NSObject>

- (void) willStartWiimoteConnections;
- (void) WiiRemoteDiscovered:(WiiRemote*)wiimote;
- (void) WiiRemoteDiscoveryError:(int)code;

@end;