import React, {
  useState,
  useEffect,
  Fragment,
  useCallback,
  useRef,
} from "react";
import { format } from "date-fns";
import {
  ArrowLeft,
  Search,
  MessagesSquare,
  MessageSquareText,
  Send,
  Loader2,
  RefreshCcw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { getAllDocs, getDocById } from "@/utils/apiUtils";

const AUTO_REFRESH_INTERVAL = 20000;
const PAGE_SIZE = 50;

const ChatHistory = () => {
  const { id } = useParams();

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);
  const [mobileSelectedUser, setMobileSelectedUser] = useState(null);
  const [chatList, setChatList] = useState([]);
  const [totalDocs, setTotalDocs] = useState(0);
  const [chatHistory, setChatHistory] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [listError, setListError] = useState("");

  const chatContainerRef = useRef(null);
  const isUserScrollingRef = useRef(false);
  const lastMessageCountRef = useRef(0);
  const listAbortRef = useRef(null);
  const threadAbortRef = useRef(null);

  const totalPages = Math.max(1, Math.ceil(totalDocs / PAGE_SIZE));

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchChatList = useCallback(
    async ({ silent = false, pageOverride } = {}) => {
      listAbortRef.current?.abort();
      const controller = new AbortController();
      listAbortRef.current = controller;
      const currentPage = pageOverride ?? page;
      try {
        if (!silent) setLoading(true);
        const res = await getAllDocs(
          currentPage,
          PAGE_SIZE,
          search,
          controller.signal
        );
        if (res?.cancelled) return;
        if (!res?.success) {
          if (!silent) setListError(res?.message || "Could not load chats.");
          setChatList([]);
          setTotalDocs(0);
          return;
        }
        setListError("");
        setChatList(res?.data?.docs || []);
        setTotalDocs(res?.data?.total_docs || 0);
      } catch {
        if (!silent) setListError("Could not load chats.");
        setChatList([]);
      } finally {
        if (!controller.signal.aborted && !silent) setLoading(false);
      }
    },
    [page, search]
  );

  const fetchChatHistory = useCallback(async (userId, silent = false) => {
    if (!userId) return [];
    threadAbortRef.current?.abort();
    const controller = new AbortController();
    threadAbortRef.current = controller;
    try {
      const res = await getDocById(userId, controller.signal);
      if (res?.cancelled) return null;
      return res?.data?.chat_history || [];
    } catch {
      return [];
    }
  }, []);

  useEffect(() => {
    fetchChatList({ silent: false });
    return () => listAbortRef.current?.abort();
  }, [fetchChatList]);

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") {
        fetchChatList({ silent: true });
      }
    };
    const interval = setInterval(tick, AUTO_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchChatList]);

  useEffect(() => {
    if (!id) return;
    const fromList = chatList.find((u) => u._id === id);
    if (fromList) {
      setSelectedUser((prev) => (prev?._id === fromList._id ? prev : fromList));
      setMobileSelectedUser((prev) =>
        prev?._id === fromList._id ? prev : fromList
      );
      return;
    }
    let cancelled = false;
    getDocById(id).then((res) => {
      const data = res?.data;
      if (cancelled || !data) return;
      setSelectedUser({
        _id: data._id,
        username: data.username,
        phone_number: data.phone_number,
        updated_at: data.updated_at,
      });
      setMobileSelectedUser({
        _id: data._id,
        username: data.username,
        phone_number: data.phone_number,
        updated_at: data.updated_at,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [id, chatList]);

  const loadChatHistory = useCallback(
    async (silent = false) => {
      if (!selectedUser) return;
      if (!silent) setLoadingChat(true);
      try {
        const history = await fetchChatHistory(selectedUser._id, silent);
        if (history == null) return;
        if (history.length !== lastMessageCountRef.current) {
          setChatHistory(history);
          lastMessageCountRef.current = history.length;
          if (!isUserScrollingRef.current) {
            requestAnimationFrame(() => {
              const el = chatContainerRef.current;
              if (el) el.scrollTop = el.scrollHeight;
            });
          }
        }
      } finally {
        if (!silent) setLoadingChat(false);
      }
    },
    [selectedUser, fetchChatHistory]
  );

  useEffect(() => {
    lastMessageCountRef.current = 0;
    setChatHistory([]);
    loadChatHistory(false);
    return () => threadAbortRef.current?.abort();
  }, [loadChatHistory]);

  useEffect(() => {
    if (!selectedUser) return;
    const tick = () => {
      if (document.visibilityState === "visible") {
        loadChatHistory(true);
      }
    };
    const interval = setInterval(tick, AUTO_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [selectedUser, loadChatHistory]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchChatList({ silent: false });
    await loadChatHistory(false);
    setRefreshing(false);
  };

  const initial = (name) => (name || "?").charAt(0).toUpperCase();

  return (
    <div className="flex h-[80%] w-full bg-background mb-5">
      <div className="flex w-full sm:w-80 lg:w-96 flex-col border-r">
        <div className="border-b p-4 bg-card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl">Inbox</h1>
              <MessagesSquare className="h-5 w-5" />
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCcw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" />
            <input
              className="w-full h-10 pl-10 pr-4 rounded-md border bg-background text-sm"
              placeholder="Search chat..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : listError ? (
            <p className="text-sm text-destructive text-center p-8">
              {listError}
            </p>
          ) : chatList.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center p-8">
              No chats yet.
            </p>
          ) : (
            chatList.map((user) => (
              <Fragment key={user._id}>
                <button
                  className={`w-full p-4 text-left hover:bg-accent ${
                    selectedUser?._id === user._id ? "bg-muted" : ""
                  }`}
                  onClick={() => {
                    setSelectedUser(user);
                    setMobileSelectedUser(user);
                  }}
                >
                  <div className="flex gap-3">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="font-semibold text-primary">
                        {initial(user.username)}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between mb-1">
                        <span className="font-medium truncate">
                          {user.username || user.phone_number}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {(() => {
                            if (!user.updated_at) return "";
                            const d = new Date(user.updated_at);
                            return Number.isNaN(d.getTime()) ? "" : format(d, "MMM d");
                          })()}
                        </span>
                      </div>

                      <p className="text-sm text-muted-foreground truncate">
                        {user.phone_number}
                      </p>
                    </div>
                  </div>
                </button>
                <div className="border-b mx-4" />
              </Fragment>
            ))
          )}
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-3 border-t text-sm">
            <span className="text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {selectedUser ? (
        <div className="flex-1 flex flex-col bg-background">
          <div className="border-b p-4 bg-card flex gap-3 items-center">
            <button
              className="sm:hidden p-2 hover:bg-accent rounded-md"
              onClick={() => {
                setSelectedUser(null);
                setMobileSelectedUser(null);
              }}
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="font-semibold text-primary">
                {initial(selectedUser.username)}
              </span>
            </div>

            <div>
              <h2 className="font-semibold">
                {selectedUser.username || selectedUser.phone_number}
              </h2>
              <p className="text-sm text-muted-foreground">
                {selectedUser.phone_number}
              </p>
            </div>
          </div>

          <div
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto p-4"
            onScroll={() => {
              const el = chatContainerRef.current;
              if (!el) return;

              const atBottom =
                el.scrollHeight - el.scrollTop - el.clientHeight < 50;

              isUserScrollingRef.current = !atBottom;
            }}
          >
            {loadingChat ? (
              <div className="flex justify-center h-full items-center">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {chatHistory.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${
                      msg.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[70%] px-4 py-2 rounded-2xl shadow text-sm ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="hidden sm:flex flex-1 items-center justify-center">
          <div className="text-center space-y-4">
            <MessageSquareText className="mx-auto h-8 w-8" />
            <p>Select a profile to see conversations</p>
            <Link to="/trigger-campaign">
              <Button className="gap-2">
                <Send className="h-4 w-4" /> Trigger Campaign
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatHistory;
