//
//  ContainerWindowController.m
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

#import "ContainerWindowController.h"

@interface ContainerWindowController()

- (ContainerView *)containerView;

@end

@implementation ContainerWindowController

- (ContainerView *)containerView {
	return (ContainerView *) [self view];
}

- (WebView *)webView {
	return [[self containerView] webView];
}

- (WebView *)mapView {
	return [[self containerView] mapView];
}

- (BalanceBeamView *)bbView {
	return [[self containerView] bbView];
}

- (NSProgressIndicator *)spinner {
	return [[self containerView] spinner];
}

- (NSTextField *)prompt {
	return [[self containerView] prompt];
}

- (NSButton *)searchDisclosure {
	return [[self containerView] searchDisclosure];
}

- (NSSearchField *)searchText {
	return [[self containerView] searchText];
}

- (NSTextField *)legend {
	return [[self containerView] legend];
}

- (void)webView:(WebView *)sender didFinishLoadForFrame:(WebFrame *)frame {
	if (sender == [self webView]) {
		if (!earthLoaded) {
			NSLog(@"INIT");
			[sender stringByEvaluatingJavaScriptFromString:@"init()"];
			earthLoaded = true;
		} else if (locationTimer == nil) {
			locationTimer = [NSTimer scheduledTimerWithTimeInterval:0.5f target:self selector:@selector(updateLocation:) userInfo:nil repeats:YES];
		}
	}
}

- (void)updateLocation:(NSTimer *)timer {
	NSString *result = [[self webView] stringByEvaluatingJavaScriptFromString:@"getLocation()"];
	NSString *query = [NSString stringWithFormat:@"updateLocation('%@');", result];
	[[self mapView] stringByEvaluatingJavaScriptFromString:query];
}

- (void)showSearch {
	[[self searchText] setHidden:NO];
	[[self window] makeFirstResponder:[self searchText]];
}

- (void)hideSearch {
    [[self searchText] setHidden:YES];
    [[self window] makeFirstResponder:[self webView]];
}

- (IBAction)toggleSearchDisclosure:(id)sender {
	if ([sender state]) {
		[self showSearch];
	} else {
		[self hideSearch];
	}
}

- (IBAction)revealSearch:(id)sender {
	[[self searchDisclosure] setState:YES];
	[self showSearch];
}

- (IBAction)doSearch:(id)sender {
	NSString *s = [sender stringValue];
	if (0 != [s length]) {
		[sender setStringValue:@""];
		NSArray *recentSearches = [[self searchText] recentSearches];
		if (![recentSearches containsObject:s]) {
			NSMutableArray *newSearches = [[recentSearches mutableCopy] autorelease];
			if (newSearches == nil) {
				newSearches = [NSMutableArray array];
			}
			[newSearches insertObject:s atIndex:0];
			[[self searchText] setRecentSearches:newSearches];
		}
		NSString *stringField = [[s stringByReplacingOccurrencesOfString:@"\\" withString:@"\\\\"] 
								  stringByReplacingOccurrencesOfString:@"\"" withString:@"\\\""];
		NSString *teleportSearch = [NSString stringWithFormat:@"doGeocode(\"%@\")", stringField];
		NSString *result = [[self webView] stringByEvaluatingJavaScriptFromString:teleportSearch];
		if ([result length] != 0) {
			[[self legend] setStringValue:NSLocalizedString(@"Failed to teleport specified place", @"")];
		} else {
			[[self legend] setStringValue:s];
		}
		[[self searchDisclosure] setState:NO];
		[self hideSearch];
	}
}

- (id)init {
	self = [super init];
	earthLoaded = false;
	locationTimer = nil;
	return self;
}

- (void)dealloc {
	[locationTimer invalidate];
	[super dealloc];
}

@end
