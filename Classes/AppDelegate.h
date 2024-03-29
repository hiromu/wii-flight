//
//  AppDelegate.h
//  WiiFlight
//
//   Copyright 2009 Google Inc.
//   Modified for WiiFlight 2012 Hiromu Yakura.
//
//   Licensed under the Apache License, Version 2.0 (the "License");
//   you may not use this file except in compliance with the License.
//   You may obtain a copy of the License at
//
//       http://www.apache.org/licenses/LICENSE-2.0
//
//   Unless required by applicable law or agreed to in writing, software
//   distributed under the License is distributed on an "AS IS" BASIS,
//   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//   See the License for the specific language governing permissions and
//   limitations under the License.

#import <Cocoa/Cocoa.h>
#import <WebKit/WebKit.h>

#import "BalanceBeamView.h"
#import "ContainerWindowController.h"
#import "NSString+Replacing.h"
#import "SurfboardDecoder.h"
#import "WiiRemote.h"
#import "WiiRemoteDiscovery.h"

@class ContainerWindowController;
@class BalanceBeamView;
@class SurfboardDecoder;

@interface AppDelegate : NSResponder<SurfboardDecoderDelegate, WiiRemoteDiscoveryDelegate, WiiRemoteDelegate> {
	int teleportIndex_;
	ContainerWindowController *winController_;
	WiiRemoteDiscovery *discovery_;
	WiiRemote *wii_;
	SurfboardDecoder *surfboardDecoder_;
	BOOL isBalanceBeamCalibrated_;
	BOOL isShuttingDown_;
	float xFloat_;
	float yFloat_;
	int x_;
	int y_;
}

- (IBAction)moveLeft:(id)sender;
- (IBAction)moveRight:(id)sender;
- (IBAction)moveFaster:(id)sender;
- (IBAction)moveSlower:(id)sender;
- (IBAction)nextTeleport:(id)sender;
- (IBAction)clearCache:(id)sender;

- (IBAction)startLeft:(id)sender;
- (IBAction)startRight:(id)sender;
- (IBAction)startFaster:(id)sender;
- (IBAction)startSlower:(id)sender;

- (IBAction)stopLeft:(id)sender;
- (IBAction)stopRight:(id)sender;
- (IBAction)stopFaster:(id)sender;
- (IBAction)stopSlower:(id)sender;

- (IBAction)toggleFullScreen:(id)sender;
@end