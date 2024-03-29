//
//  ContainerWindowController.h
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
//

#import <WebKit/WebKit.h>

#import "AppDelegate.h"
#import "ContainerView.h"
#import "FullScreenableWindowController.h"

@class BalanceBeamView;
@class WebView;

// owns a window with a view that we can make full size.
// provides accessors for the pieces of the window.
@interface ContainerWindowController : FullScreenableWindowController {
	bool earthLoaded;
	NSTimer *locationTimer;
}

- (WebView *)webView;
- (WebView *)mapView;
- (BalanceBeamView *)bbView;
- (NSProgressIndicator *)spinner;
- (NSTextField *)prompt;
- (NSButton *)searchDisclosure;
- (NSSearchField *)searchText;
- (NSTextField *)legend;
- (void)updateLocation:(NSTimer *)timer;


- (IBAction)revealSearch:(id)sender;
- (IBAction)toggleSearchDisclosure:(id)sender;
- (IBAction)doSearch:(id)sender;
@end