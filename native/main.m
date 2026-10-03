#import <AppKit/AppKit.h>

typedef NS_ENUM(NSInteger, PetState) {
    PetStateIdle = 0,
    PetStateWorking = 1,
    PetStateComplete = 2
};

static NSArray<NSString *> *LinesForState(PetState state) {
    if (state == PetStateWorking) return @[
        @"专心一点，我会替你留意四周。",
        @"像修整花圃一样，一点一点来就好。",
        @"别担心，工具箱里总能找到办法。",
        @"这一小步，也在让荒地变成花园。",
        @"艾玛正在认真工作，你也要加油呀。"
    ];
    if (state == PetStateComplete) return @[
        @"完成啦！这一朵小花送给认真工作的你。",
        @"今天的花园也被照顾得很好。",
        @"做得漂亮！现在可以安心休息一下了。",
        @"看，努力已经开花了。",
        @"任务安全送达——我们配合得真好！"
    ];
    return @[
        @"花园需要耐心，任务也是。",
        @"工具箱已经准备好了，今天要修整什么呢？",
        @"嘘……你听见花开的声音了吗？",
        @"休息一会儿也没关系，我会陪着你的。",
        @"旧名字留在过去就好。现在，请叫我艾玛。",
        @"火焰会留下痕迹，但花园总会重新发芽。",
        @"如果椅子坏掉了，大家是不是就能安全一点？"
    ];
}

@interface PetImageView : NSImageView
@property (copy) void (^onTap)(void);
@property NSPoint dragStart;
@property BOOL dragged;
@end

@implementation PetImageView
- (void)mouseDown:(NSEvent *)event {
    self.dragStart = event.locationInWindow;
    self.dragged = NO;
}
- (void)mouseDragged:(NSEvent *)event {
    NSPoint point = event.locationInWindow;
    if (hypot(point.x - self.dragStart.x, point.y - self.dragStart.y) > 3) {
        self.dragged = YES;
        [self.window performWindowDragWithEvent:event];
    }
}
- (void)mouseUp:(NSEvent *)event {
    if (!self.dragged && self.onTap) self.onTap();
}
@end

@interface BubbleView : NSView
@property (strong) NSTextField *label;
@end

@implementation BubbleView
- (instancetype)initWithFrame:(NSRect)frameRect {
    if ((self = [super initWithFrame:frameRect])) {
        self.wantsLayer = YES;
        self.layer.backgroundColor = [NSColor colorWithCalibratedRed:1 green:0.973 blue:0.90 alpha:0.97].CGColor;
        self.layer.cornerRadius = 18;
        self.layer.borderWidth = 1.5;
        self.layer.borderColor = [NSColor colorWithCalibratedWhite:0.24 alpha:0.78].CGColor;
        self.layer.shadowColor = NSColor.blackColor.CGColor;
        self.layer.shadowOpacity = 0.14;
        self.layer.shadowRadius = 8;
        self.layer.shadowOffset = CGSizeMake(0, -3);

        _label = [NSTextField labelWithString:@""];
        _label.frame = NSInsetRect(self.bounds, 11, 7);
        _label.autoresizingMask = NSViewWidthSizable | NSViewHeightSizable;
        _label.alignment = NSTextAlignmentCenter;
        _label.maximumNumberOfLines = 3;
        _label.lineBreakMode = NSLineBreakByWordWrapping;
        _label.font = [NSFont systemFontOfSize:12 weight:NSFontWeightMedium];
        _label.textColor = [NSColor colorWithCalibratedRed:0.25 green:0.20 blue:0.18 alpha:1];
        [self addSubview:_label];
    }
    return self;
}
@end

@interface AppDelegate : NSObject <NSApplicationDelegate>
@property (strong) NSWindow *window;
@property (strong) PetImageView *petView;
@property (strong) BubbleView *bubble;
@property (strong) NSStatusItem *statusItem;
@property PetState currentState;
@property NSInteger detectedState;
@property (copy) NSString *lastLine;
@property NSInteger speechGeneration;
@property dispatch_source_t monitorTimer;
@end

@implementation AppDelegate

- (void)applicationDidFinishLaunching:(NSNotification *)notification {
    [NSApp setActivationPolicy:NSApplicationActivationPolicyAccessory];
    self.currentState = PetStateIdle;
    self.detectedState = -1;
    self.lastLine = @"";
    [self createWindow];
    [self createStatusItem];
    [self startMonitor];
    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(0.45 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{ [self speak]; });
}

- (void)applicationWillTerminate:(NSNotification *)notification {
    if (self.monitorTimer) dispatch_source_cancel(self.monitorTimer);
}

- (void)createWindow {
    NSSize size = NSMakeSize(275, 315);
    NSRect visible = NSScreen.mainScreen.visibleFrame;
    NSPoint origin = NSMakePoint(NSMaxX(visible) - size.width - 24, NSMinY(visible) + 24);
    self.window = [[NSWindow alloc] initWithContentRect:NSMakeRect(origin.x, origin.y, size.width, size.height)
                                              styleMask:NSWindowStyleMaskBorderless
                                                backing:NSBackingStoreBuffered
                                                  defer:NO];
    self.window.opaque = NO;
    self.window.backgroundColor = NSColor.clearColor;
    self.window.hasShadow = NO;
    self.window.level = NSFloatingWindowLevel;
    self.window.collectionBehavior = NSWindowCollectionBehaviorCanJoinAllSpaces | NSWindowCollectionBehaviorFullScreenAuxiliary;
    self.window.movableByWindowBackground = YES;

    NSView *root = [[NSView alloc] initWithFrame:NSMakeRect(0, 0, size.width, size.height)];
    root.wantsLayer = YES;
    self.window.contentView = root;

    self.bubble = [[BubbleView alloc] initWithFrame:NSMakeRect(15, 251, 245, 56)];
    self.bubble.hidden = YES;
    [root addSubview:self.bubble];

    self.petView = [[PetImageView alloc] initWithFrame:NSMakeRect(37, 39, 200, 200)];
    self.petView.imageScaling = NSImageScaleProportionallyUpOrDown;
    __weak typeof(self) weakSelf = self;
    self.petView.onTap = ^{ [weakSelf speak]; };
    [root addSubview:self.petView];
    [self setState:PetStateIdle speak:NO];
    [self.window orderFrontRegardless];
}

- (NSImage *)imageForState:(PetState)state {
    NSString *name = state == PetStateWorking ? @"gardener-working" : (state == PetStateComplete ? @"gardener-complete" : @"gardener-idle");
    NSString *path = [NSBundle.mainBundle pathForResource:name ofType:@"png" inDirectory:@"assets"];
    return path ? [[NSImage alloc] initWithContentsOfFile:path] : nil;
}

- (void)setState:(PetState)state speak:(BOOL)shouldSpeak {
    self.currentState = state;
    self.petView.image = [self imageForState:state];
    if (shouldSpeak) [self speak];
}

- (void)speak {
    NSArray<NSString *> *pool = LinesForState(self.currentState);
    NSMutableArray<NSString *> *choices = [pool mutableCopy];
    if (self.lastLine.length) [choices removeObject:self.lastLine];
    if (!choices.count) choices = [pool mutableCopy];
    NSString *line = choices[arc4random_uniform((uint32_t)choices.count)];
    self.lastLine = line;
    self.bubble.label.stringValue = line;
    self.bubble.hidden = NO;
    NSInteger generation = ++self.speechGeneration;
    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(4.6 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
        if (generation == self.speechGeneration) self.bubble.hidden = YES;
    });
}

- (void)createStatusItem {
    self.statusItem = [NSStatusBar.systemStatusBar statusItemWithLength:NSSquareStatusItemLength];
    NSString *iconPath = [NSBundle.mainBundle pathForResource:@"icon" ofType:@"png"];
    NSImage *icon = iconPath ? [[NSImage alloc] initWithContentsOfFile:iconPath] : nil;
    if (icon) {
        icon.size = NSMakeSize(18, 18);
        self.statusItem.button.image = icon;
    } else {
        self.statusItem.button.title = @"✿";
    }
    NSMenu *menu = [[NSMenu alloc] init];
    [menu addItemWithTitle:@"叫回园丁" action:@selector(showPet:) keyEquivalent:@""];
    [menu addItemWithTitle:@"隐藏" action:@selector(hidePet:) keyEquivalent:@""];
    [menu addItem:NSMenuItem.separatorItem];
    [menu addItemWithTitle:@"退出园丁桌宠" action:@selector(quit:) keyEquivalent:@"q"];
    for (NSMenuItem *item in menu.itemArray) item.target = self;
    self.statusItem.menu = menu;
}

- (IBAction)showPet:(id)sender { [self.window orderFrontRegardless]; }
- (IBAction)hidePet:(id)sender { [self.window orderOut:nil]; }
- (IBAction)quit:(id)sender { [NSApp terminate:nil]; }

- (NSDate *)dateFromISO:(NSString *)value {
    NSISO8601DateFormatter *formatter = [[NSISO8601DateFormatter alloc] init];
    formatter.formatOptions = NSISO8601DateFormatWithInternetDateTime | NSISO8601DateFormatWithFractionalSeconds;
    NSDate *date = [formatter dateFromString:value];
    if (date) return date;
    formatter.formatOptions = NSISO8601DateFormatWithInternetDateTime;
    return [formatter dateFromString:value];
}

- (NSDictionary *)latestEventInFile:(NSURL *)url {
    NSFileHandle *handle = [NSFileHandle fileHandleForReadingFromURL:url error:nil];
    if (!handle) return nil;
    unsigned long long size = [handle seekToEndOfFile];
    [handle seekToFileOffset:size > 131072 ? size - 131072 : 0];
    NSData *data = [handle readDataToEndOfFile];
    [handle closeFile];
    NSString *text = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
    NSArray<NSString *> *lines = [text componentsSeparatedByString:@"\n"];
    for (NSString *line in lines.reverseObjectEnumerator) {
        if (![line containsString:@"task_started"] && ![line containsString:@"task_complete"] && ![line containsString:@"turn_aborted"]) continue;
        NSDictionary *row = [NSJSONSerialization JSONObjectWithData:[line dataUsingEncoding:NSUTF8StringEncoding] options:0 error:nil];
        if (![row isKindOfClass:NSDictionary.class] || ![row[@"type"] isEqual:@"event_msg"]) continue;
        NSDictionary *payload = row[@"payload"];
        NSString *kind = payload[@"type"];
        if (![@[@"task_started", @"task_complete", @"turn_aborted"] containsObject:kind]) continue;
        NSDate *date = [self dateFromISO:row[@"timestamp"]];
        if (date) return @{@"kind": kind, @"time": date};
    }
    return nil;
}

- (NSArray<NSURL *> *)recentSessionFiles {
    NSURL *root = [NSFileManager.defaultManager.homeDirectoryForCurrentUser URLByAppendingPathComponent:@".codex/sessions" isDirectory:YES];
    NSArray *keys = @[NSURLContentModificationDateKey, NSURLIsRegularFileKey];
    NSDirectoryEnumerator *enumerator = [NSFileManager.defaultManager enumeratorAtURL:root includingPropertiesForKeys:keys options:NSDirectoryEnumerationSkipsHiddenFiles errorHandler:nil];
    NSDate *cutoff = [NSDate dateWithTimeIntervalSinceNow:-8 * 60 * 60];
    NSMutableArray<NSDictionary *> *found = [NSMutableArray array];
    for (NSURL *url in enumerator) {
        if (![url.pathExtension isEqual:@"jsonl"]) continue;
        NSDictionary *values = [url resourceValuesForKeys:keys error:nil];
        NSDate *modified = values[NSURLContentModificationDateKey];
        if (![values[NSURLIsRegularFileKey] boolValue] || !modified || [modified compare:cutoff] == NSOrderedAscending) continue;
        [found addObject:@{@"url": url, @"date": modified}];
    }
    [found sortUsingComparator:^NSComparisonResult(NSDictionary *a, NSDictionary *b) { return [b[@"date"] compare:a[@"date"]]; }];
    if (found.count > 12) [found removeObjectsInRange:NSMakeRange(12, found.count - 12)];
    return [found valueForKey:@"url"];
}

- (PetState)detectState {
    NSDate *now = NSDate.date;
    NSMutableArray<NSDictionary *> *events = [NSMutableArray array];
    for (NSURL *url in [self recentSessionFiles]) {
        NSDictionary *event = [self latestEventInFile:url];
        if (event) [events addObject:event];
    }
    NSDictionary *latest = [events sortedArrayUsingComparator:^NSComparisonResult(NSDictionary *a, NSDictionary *b) { return [b[@"time"] compare:a[@"time"]]; }].firstObject;
    if ([latest[@"kind"] isEqual:@"task_started"] && [now timeIntervalSinceDate:latest[@"time"]] < 6 * 60 * 60) return PetStateWorking;
    if ([latest[@"kind"] isEqual:@"task_complete"] && [now timeIntervalSinceDate:latest[@"time"]] < 8) return PetStateComplete;
    return PetStateIdle;
}

- (void)startMonitor {
    dispatch_queue_t queue = dispatch_queue_create("gardener.codex.monitor", DISPATCH_QUEUE_SERIAL);
    self.monitorTimer = dispatch_source_create(DISPATCH_SOURCE_TYPE_TIMER, 0, 0, queue);
    dispatch_source_set_timer(self.monitorTimer, DISPATCH_TIME_NOW, 800 * NSEC_PER_MSEC, 100 * NSEC_PER_MSEC);
    __weak typeof(self) weakSelf = self;
    dispatch_source_set_event_handler(self.monitorTimer, ^{
        typeof(self) selfRef = weakSelf;
        if (!selfRef) return;
        PetState next = [selfRef detectState];
        if (next == selfRef.detectedState) return;
        selfRef.detectedState = next;
        dispatch_async(dispatch_get_main_queue(), ^{ [selfRef setState:next speak:YES]; });
    });
    dispatch_resume(self.monitorTimer);
}
@end

int main(int argc, const char *argv[]) {
    @autoreleasepool {
        NSApplication *application = NSApplication.sharedApplication;
        AppDelegate *delegate = [[AppDelegate alloc] init];
        application.delegate = delegate;
        [application run];
    }
    return 0;
}
